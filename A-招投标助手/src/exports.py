"""Export a bid case into a reviewable, self-contained tender package.

This module deliberately does not decide whether a case may be exported.  The
caller owns review/approval; this function only serializes the data it receives.
"""

from __future__ import annotations

import copy
import hashlib
import io
import json
import os
import re
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping
from xml.sax.saxutils import escape

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import Paragraph, SimpleDocTemplate


_MISSING = "【待补】"
_DISCLAIMER = "草稿／模拟数据／待签章／不具法律效力"
_DOC_TYPES = (
    ("authorization_zh.docx", ("授权书", "授权"), "法定代表人授权书（中文）"),
    ("authorization_en.docx", ("authorization", "manufacturer", "maf"), "Manufacturer's Authorization（English）"),
    ("commitment_zh.docx", ("承诺书", "承诺"), "承诺书（中文）"),
    ("commitment_en.docx", ("declaration", "commitment", "bid-securing"), "Bid-Securing Declaration（English）"),
)


def _text(value: Any, default: str = _MISSING) -> str:
    if value is None or value == "":
        return default
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


def _safe_component(value: Any, fallback: str = "case") -> str:
    candidate = re.sub(r"[^A-Za-z0-9._-]+", "_", _text(value, "")).strip("._-")
    return (candidate[:80] or fallback)


def _json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8")


def _case_id(case: Mapping[str, Any]) -> str:
    return _text(case.get("id"), "case")


def _owner(case: Mapping[str, Any]) -> dict[str, Any]:
    value = case.get("owner")
    return dict(value) if isinstance(value, Mapping) else {"name": _text(value)}


def _stable_id(prefix: str, case: Mapping[str, Any]) -> str:
    number = int.from_bytes(hashlib.sha256(_json_bytes({"id": _case_id(case), "notice": case.get("notice", {})})).digest()[:16], "big")
    alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    encoded = ""
    for _ in range(26):
        encoded = alphabet[number & 31] + encoded
        number >>= 5
    return f"{prefix}_{encoded}"


def _get_path(data: Mapping[str, Any], path: str) -> Any:
    current: Any = data
    for part in path.split("."):
        if not isinstance(current, Mapping) or part not in current:
            return None
        current = current[part]
    return current


def _value_map(case: Mapping[str, Any]) -> dict[str, str]:
    """Values allowed in document placeholders, all sourced from ``case``."""
    company = case.get("company") or {}
    notice = case.get("notice") or {}
    owner = _owner(case)
    values: dict[str, str] = {}
    for prefix, source in (("company", company), ("notice", notice), ("owner", owner)):
        if isinstance(source, Mapping):
            for key in source:
                values[f"{prefix}.{key}"] = _text(source.get(key))
    values.update(
        {
            "company.name": _text(company.get("name")),
            "company.name_en": _text(company.get("name_en")),
            "company.representative": _text(company.get("representative")),
            "company.address": _text(company.get("address")),
            "notice.title": _text(notice.get("title")),
            "notice.buyer": _text(notice.get("buyer")),
            "notice.country": _text(notice.get("country")),
            "notice.deadline": _text(notice.get("deadline")),
            "notice.source_url": _text(notice.get("source_url")),
            "owner.name": _text(owner.get("name")),
        }
    )
    return values


def _replace_placeholders(content: str, values: Mapping[str, str]) -> list[tuple[str, bool]]:
    """Return text chunks, marking unknown or missing placeholders as missing."""
    chunks: list[tuple[str, bool]] = []
    pattern = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")
    cursor = 0
    for match in pattern.finditer(content):
        if match.start() > cursor:
            chunks.append((content[cursor : match.start()], False))
        key = match.group(1).strip()
        value = values.get(key)
        chunks.append((value if value not in (None, "", _MISSING) else f"{_MISSING}：{key}", True if value in (None, "", _MISSING) else False))
        cursor = match.end()
    if cursor < len(content):
        chunks.append((content[cursor:], False))
    if not chunks:
        chunks.append((content, False))
    return chunks


def _document_source(documents: Iterable[Mapping[str, Any]], tokens: tuple[str, ...], fallback: str) -> str:
    want_authorization = tokens[0] in ("授权书", "authorization")
    want_english = tokens[0] in ("authorization", "declaration")
    for document in documents:
        name = _text(document.get("name"), "").lower()
        authorization = any(token in name for token in ("授权", "auth", "manufacturer", "maf"))
        commitment = any(token in name for token in ("承诺", "commit", "declar", "bid-securing", "bid_securing"))
        english = bool(re.search(r"英文|英语|english|(?:^|[^a-z])en(?:[^a-z]|$)", name))
        if not re.search(r"中文|汉语|chinese|(?:^|[^a-z])zh(?:[^a-z]|$)", name) and not re.search(r"授权|承诺", name):
            english = True
        if ((authorization if want_authorization else commitment) and english == want_english):
            return _text(document.get("content"), _MISSING)
    return fallback


def _make_docx(content: str, title: str, values: Mapping[str, str]) -> bytes:
    document = Document()
    normal = document.styles["Normal"]
    normal.font.name = "宋体"
    normal.element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "宋体")
    section = document.sections[0]
    section.top_margin = Mm(20)
    section.bottom_margin = Mm(20)
    heading = document.add_paragraph()
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = heading.add_run(title)
    run.bold = True
    run.font.size = Pt(16)
    for line in content.splitlines() or [""]:
        paragraph = document.add_paragraph()
        for text, missing in _replace_placeholders(line, values):
            for part in re.split(r"(【待补[^】]*】)", text):
                if not part:
                    continue
                run = paragraph.add_run(part)
                run.font.size = Pt(11)
                if missing or "【待补" in part:
                    run.font.color.rgb = RGBColor(0xFF, 0x00, 0x00)
    notice = document.add_paragraph()
    notice.alignment = WD_ALIGN_PARAGRAPH.CENTER
    marker = notice.add_run(_DISCLAIMER)
    marker.bold = True
    marker.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)
    marker.font.size = Pt(9)
    stream = io.BytesIO()
    document.save(stream)
    return stream.getvalue()


def _status(value: Any) -> str:
    return _text(value, _MISSING)


def _make_xlsx(title: str, headers: list[str], rows: list[list[Any]]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title[:31]
    sheet.append([_DISCLAIMER])
    sheet.cell(1, 1).font = Font(bold=True, color="B91C1C")
    sheet.freeze_panes = "A3"
    sheet.append(headers)
    for cell in sheet[2]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="B91C1C")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    for row in rows:
        row_number = sheet.max_row + 1
        for index, value in enumerate(row, 1):
            # Explicit strings are literal cells even when they begin with '='.
            cell = sheet.cell(row_number, index, _text(value))
            cell.data_type = "s"
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            if "【待补" in cell.value:
                cell.font = Font(color="FF0000")
    sheet.auto_filter.ref = f"A2:{sheet.cell(sheet.max_row, len(headers)).coordinate}"
    for column in sheet.columns:
        width = min(max(len(str(cell.value or "")) for cell in column) + 2, 48)
        sheet.column_dimensions[column[0].column_letter].width = width
    stream = io.BytesIO()
    workbook.save(stream)
    return stream.getvalue()


def _make_report(case: Mapping[str, Any]) -> bytes:
    """Use a CID font and escaped, wrapping paragraphs for Chinese reports."""
    font_name = "STSong-Light"
    pdfmetrics.registerFont(UnicodeCIDFont(font_name))
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "ChineseBody", parent=styles["BodyText"], fontName=font_name,
        fontSize=10, leading=16, wordWrap="CJK", splitLongWords=True,
    )
    heading = ParagraphStyle(
        "ChineseHeading", parent=body, fontSize=13, leading=20,
        spaceBefore=10, spaceAfter=5, keepWithNext=True,
        textColor=colors.HexColor("#991B1B"),
    )
    title = ParagraphStyle("ChineseTitle", parent=heading, fontSize=18, leading=26, alignment=1)

    def paragraph(value: Any, style: ParagraphStyle = body) -> Paragraph:
        return Paragraph(escape(_text(value)).replace("\n", "<br/>"), style)

    notice = case.get("notice") or {}
    dd = case.get("due_diligence") or {}
    story = [paragraph("甲方背调报告", title), paragraph(_DISCLAIMER)]
    story.append(paragraph("项目与来源", heading))
    for label, value in (
        ("项目编号", notice.get("id")), ("项目", notice.get("title")),
        ("甲方", notice.get("buyer")), ("国家/地区", notice.get("country")),
        ("投标截止", notice.get("deadline")), ("负责人", _owner(case).get("name")),
        ("公告来源", notice.get("source_url")),
    ):
        story.append(paragraph(f"{label}：{_text(value)}"))
    story.append(paragraph("背调结果（按输入记录，不重新评分）", heading))
    for label, key in (("风险等级", "level"), ("风险分", "score"), ("置信度", "confidence")):
        story.append(paragraph(f"{label}：{_text(dd.get(key))}"))
    story.append(paragraph("数据缺口", heading))
    for gap in dd.get("data_gaps") or [_MISSING]:
        story.append(paragraph(gap))
    story.append(paragraph("规则与证据", heading))
    for rule in dd.get("rules") or [_MISSING]:
        if isinstance(rule, Mapping):
            for key, value in rule.items():
                story.append(paragraph(f"{key}：{_text(value)}"))
        else:
            story.append(paragraph(rule))
    story.append(paragraph("材料清单（不附证照、不生成证照）", heading))
    for item in case.get("checklist") or []:
        story.append(paragraph(f"{_text(item.get('id'))} · {_text(item.get('label'))}"))
        story.append(paragraph(f"状态：{_text(item.get('status'))}；原因：{_text(item.get('reason'))}"))
        story.append(paragraph(f"匹配材料记录：{_text(item.get('material'))}"))
    story.append(paragraph("公告要求与出处", heading))
    for req in case.get("requirements") or []:
        for label, key in (("编号", "id"), ("类型", "type"), ("要求", "label"), ("原文", "quote"), ("来源", "source")):
            story.append(paragraph(f"{label}：{_text(req.get(key))}"))
    story.append(paragraph("复核记录（原样记录，不代表签章生效）", heading))
    story.append(paragraph(case.get("review")))
    stream = io.BytesIO()
    pdf = SimpleDocTemplate(
        stream, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=20 * mm, title="甲方背调报告 · 草稿",
        author="", subject=_DISCLAIMER,
    )

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont(font_name, 8)
        canvas.drawString(18 * mm, 10 * mm, _DISCLAIMER)
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, str(document.page))
        canvas.restoreState()

    pdf.build(story, onFirstPage=footer, onLaterPages=footer)
    return stream.getvalue()


def _file_ref(filename: str, content: bytes, case: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "file_id": _stable_id("f", {"id": f"{case.get('id')}:{filename}"}),
        "name": filename, "path": filename,
        "mime": "application/pdf" if filename.endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "size_bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(),
    }


def _build_tender_package(case: Mapping[str, Any], files: Mapping[str, bytes]) -> dict[str, Any]:
    """Map to the core PRD 7.3.2 names, preserving unknown data as unknown."""
    notice = case.get("notice") or {}
    company = case.get("company") or {}
    checklist = case.get("checklist") or []
    dd = case.get("due_diligence") or {}
    qualification = []
    categories = {
        "iso": "certification", "reference": "performance", "permit": "license",
        "experience": "performance", "eligibility": "other",
    }
    valid_categories = {"license", "performance", "financial", "personnel", "certification", "other"}
    for index, req in enumerate(case.get("requirements") or [], 1):
        matched = next((item for item in checklist if item.get("id") == req.get("id")), {})
        category = categories.get(req.get("type"), req.get("type"))
        status = {"green": "met", "yellow": "unknown", "red": "missing"}.get(matched.get("status"), matched.get("status"))
        qualification.append({
            "req_id": f"q_{index:02d}", "text": _text(req.get("label")),
            "category": category if category in valid_categories else "other",
            "mandatory": req.get("mandatory"),
            "status": status if status in {"met", "missing", "expired", "unknown"} else "unknown",
        })
    documents = []
    for filename, tokens, title in _DOC_TYPES:
        supplied = _document_source(case.get("documents") or [], tokens, _MISSING)
        documents.append({
            "doc_key": Path(filename).stem, "name": title,
            "template_source": "none", "status": "missing" if supplied == _MISSING else "drafted",
            "file": _file_ref(filename, files[filename], case),
        })
    generated = datetime.now(timezone.utc).isoformat()
    owner = _owner(case)
    buyer = notice.get("buyer")
    buyer = dict(buyer) if isinstance(buyer, Mapping) else {"name": _text(buyer)}
    if notice.get("country"):
        buyer.setdefault("country", notice["country"])
    result = {
        "id": _stable_id("tp", case), "schema_version": "1.0", "version": 1,
        "created_by": {"app": "bid", "user_id": _text(owner.get("user_id"))},
        "created_at": generated, "updated_at": generated,
        "sensitivity": "internal",
        "demo_data": bool(case.get("demo_data") or notice.get("demo_data") or company.get("demo_data")),
        "lineage": [], "tags": ["草稿", "模拟数据", "待签章", "不具法律效力"],
        "tender_no": _text(notice.get("tender_no") or notice.get("id")),
        "title": _text(notice.get("title")), "buyer": buyer,
        "market": {"country": _text(notice.get("country"))},
        "source": {
            "platform": _text(notice.get("source")), "url": _text(notice.get("source_url")),
            "published_at": notice.get("published_at", notice.get("published")),
            "fetched_at": notice.get("fetched_at"),
        },
        "deadlines": {"bid_submission_at": notice.get("deadline"), "timezone": _text(notice.get("timezone"))},
        "products": copy.deepcopy(case.get("products") or []),
        "qualification_requirements": qualification, "required_documents": documents,
        "technical_docs": copy.deepcopy(case.get("technical_docs") or []),
        "due_diligence": {
            "risk_score": dd.get("score"), "risk_level": dd.get("level"),
            "rules_version": _text(dd.get("rules_version", dd.get("rule_version"))),
            "report_file": _file_ref("due_diligence_report.pdf", files["due_diligence_report.pdf"], case),
        },
        "owner": owner, "opportunity_id": _stable_id("opp", case), "status": "preparing",
    }
    if (case.get("review") or {}).get("id"):
        result["review_id"] = case["review"]["id"]
    return result


def _build_opportunity(case: Mapping[str, Any], tender: Mapping[str, Any]) -> dict[str, Any]:
    notice = case.get("notice") or {}
    deadline = notice.get("deadline")
    milestones = [] if deadline is None else [{"key": "bid_submission", "name": "投标截止", "due_at": deadline, "status": "pending", "source": "tender_package"}]
    return {
        "id": tender["opportunity_id"], "schema_version": "1.0", "version": 1, "chain_id": None,
        "created_by": tender["created_by"], "created_at": tender["created_at"], "updated_at": tender["updated_at"],
        "sensitivity": "internal", "demo_data": tender["demo_data"], "lineage": [], "name": _text(notice.get("title")),
        "customer": copy.deepcopy(tender["buyer"]), "region": {"country": _text(notice.get("country"))}, "owner": _owner(case), "tags": list(tender["tags"]),
        "stage": "registering", "milestones": milestones, "products": copy.deepcopy(tender["products"]), "tender_package_id": tender["id"],
    }


def _build_registration_rows(case: Mapping[str, Any]) -> list[list[Any]]:
    company = case.get("company") or {}
    rows = []
    for platform in ("Etimad", "UNGM"):
        rows.extend([
            [platform, "公司名称", _text(company.get("name")), "公司资料" if company.get("name") else _MISSING],
            [platform, "英文公司名称", _text(company.get("name_en")), "公司资料" if company.get("name_en") else _MISSING],
            [platform, "注册号/本地商业登记", _MISSING, "需人工"],
            [platform, "联系人", _text(_owner(case).get("name")), "负责人" if _owner(case).get("name") else "需人工"],
        ])
    return rows


def _build_sources(case: Mapping[str, Any]) -> dict[str, Any]:
    notice = case.get("notice") or {}
    return {"notice": {"url": notice.get("source_url"), "quote": notice.get("body")}, "requirements": copy.deepcopy(case.get("requirements") or []), "due_diligence": copy.deepcopy((case.get("due_diligence") or {}).get("rules") or [])}


def build_package(case: dict, destination: Path) -> Path:
    """Build and return a safe ZIP package for ``case``.

    ``destination`` may be an output directory or an explicit ``.zip`` path.
    All archive members are generated in memory, so case paths are never read
    and cannot escape the package destination.
    """
    if not isinstance(case, dict):
        raise TypeError("case must be a dict")
    destination = Path(destination)
    case_name = _safe_component(_case_id(case))
    archive_path = destination if destination.suffix.lower() == ".zip" else destination / f"tender_package_{case_name}.zip"
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    values = _value_map(case)
    supplied_documents = case.get("documents") or []
    files: dict[str, bytes] = {}
    for filename, tokens, title in _DOC_TYPES:
        content = _document_source(supplied_documents, tokens, _MISSING)
        files[filename] = _make_docx(content, title, values)
    files["due_diligence_report.pdf"] = _make_report(case)
    checklist_rows = [[item.get("id"), item.get("label"), item.get("status"), item.get("reason"), item.get("material")] for item in (case.get("checklist") or [])]
    files["材料清单.xlsx"] = _make_xlsx("材料清单", ["编号", "材料", "状态", "原因", "匹配材料"], checklist_rows)
    files["注册清单.xlsx"] = _make_xlsx("注册清单", ["平台", "字段", "值", "来源/动作"], _build_registration_rows(case))
    tender = _build_tender_package(case, files)
    opportunity = _build_opportunity(case, tender)
    files["TenderPackage.json"] = _json_bytes(tender)
    files["Opportunity.json"] = _json_bytes(opportunity)
    files["review.json"] = _json_bytes(copy.deepcopy(case.get("review") or {}))
    files["sources.json"] = _json_bytes(_build_sources(case))
    # Replace atomically: failures leave an existing package intact. Never
    # follow an output-file symlink, and never use caller names as ZIP members.
    if archive_path.is_symlink():
        raise ValueError("destination ZIP must not be a symlink")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=archive_path.parent, prefix=".bid-", suffix=".tmp", delete=False) as handle:
            temporary = Path(handle.name)
            with zipfile.ZipFile(handle, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for name, content in files.items():
                    archive.writestr(name, content)
        os.replace(temporary, archive_path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return archive_path
