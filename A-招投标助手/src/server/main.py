import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator


ROOT = Path(__file__).resolve().parents[2]
RUNTIME = Path(os.environ.get("BID_RUNTIME", str(ROOT / "data/runtime")))
RUNTIME.mkdir(parents=True, exist_ok=True)
DB = RUNTIME / "bid.sqlite3"
LOCK = threading.RLock()
CLI = shutil.which("lark-cli.cmd") or shutil.which("lark-cli")
BASE_TOKEN = os.environ.get("BID_FEISHU_BASE", "YCAlb6HPCaUFlWstIjGczmOUn6e")
TABLE_ID = os.environ.get("BID_FEISHU_TABLE", "tblqLxMB1R42jRVy")
FEISHU_URL = f"https://my.feishu.cn/base/{BASE_TOKEN}"
app = FastAPI(title="卫华 · 海外招投标助手", version="0.1.0")


def now():
    return datetime.now(timezone.utc)


def connection():
    conn = sqlite3.connect(DB, timeout=20)
    conn.row_factory = sqlite3.Row
    return conn


with connection() as conn:
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS objects (kind TEXT, id TEXT, value TEXT, PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, time TEXT, action TEXT, object_id TEXT, detail TEXT);
    """)


def save(kind, identifier, value):
    with connection() as conn:
        conn.execute("INSERT OR REPLACE INTO objects VALUES (?,?,?)", (kind, identifier, json.dumps(value, ensure_ascii=False)))
    return value


def get(kind, identifier):
    with connection() as conn:
        row = conn.execute("SELECT value FROM objects WHERE kind=? AND id=?", (kind, identifier)).fetchone()
    if not row:
        raise HTTPException(404, "记录不存在")
    return json.loads(row[0])


def all_objects(kind):
    with connection() as conn:
        return [json.loads(row[0]) for row in conn.execute("SELECT value FROM objects WHERE kind=? ORDER BY rowid", (kind,))]


def audit(action, identifier, detail):
    with connection() as conn:
        conn.execute("INSERT INTO audit(time,action,object_id,detail) VALUES(?,?,?,?)", (now().isoformat(), action, identifier, json.dumps(detail, ensure_ascii=False)))


PRODUCTS = {
    "港口起重机": ["port crane", "gantry crane", "rail-mounted", "container", "港口", "门式", "رافعة جسرية"],
    "桥式起重机": ["overhead crane", "bridge crane", "桥式", "pont roulant"],
    "电动葫芦": ["hoist", "葫芦", "palan"],
}
MARKETS = {"中东": ["沙特", "阿联酋", "也门", "卡塔尔"], "东南亚": ["泰国", "马来西亚", "新加坡", "印尼", "印度尼西亚"], "欧洲": ["德国", "奥地利", "丹麦", "法国"], "非洲": ["肯尼亚", "南非"], "中亚": ["蒙古", "蒙古国", "乌兹别克斯坦"]}
COMPANY = {"name": "河南卫华（演示主体）", "name_en": "Weihua Demo Company", "representative": "测试业务员（虚构）", "address": "【待补：经核验的注册地址】", "demo_data": True}
MATERIALS = [
    {"id": "mat_license", "type": "license", "name": "营业执照台账样例", "valid_until": None, "verified": False, "demo_data": True},
    {"id": "mat_iso", "type": "iso", "name": "ISO 9001 台账样例（有效）", "valid_until": (now() + timedelta(days=365)).date().isoformat(), "verified": True, "demo_data": True},
    {"id": "mat_permit", "type": "permit", "name": "制造许可台账样例（过期）", "valid_until": (now() - timedelta(days=1)).date().isoformat(), "verified": True, "demo_data": True},
    {"id": "mat_reference", "type": "reference", "name": "公开业绩线索（非合同证明）", "valid_until": None, "verified": False, "demo_data": True, "source_url": "https://www.cranewh.com/detail/5418.html"},
]
PATTERNS = {
    "license": ("营业执照 / 企业注册文件", r"business registration|business license|营业执照|注册证明"),
    "iso": ("ISO 9001 质量认证", r"ISO\s*9001"),
    "permit": ("起重设备制造许可", r"manufactur\w* licen[cs]e|制造许可"),
    "reference": ("类似项目业绩证明", r"similar (?:contract|project|experience)|past performance|类似业绩|业绩证明"),
    "authorization": ("制造商授权书", r"manufacturer.?s authori[sz]ation|授权书"),
    "declaration": ("投标承诺书", r"bid.securing declaration|承诺书"),
    "financial": ("财务报表", r"financial statements?|财务报表"),
}


def seed():
    if not all_objects("notice"):
        for index, buyer in enumerate(["演示港务机构", "DEMO SANCTIONED PORT LTD"]):
            notice = {"id": f"demo_{index + 1}", "title": "港口门式起重机采购 · 完整流程样例" if index == 0 else "制裁命中阻断 · 虚构测试项目", "country": "沙特", "buyer": buyer, "source": "模拟验收样本", "source_url": "/api/demo-source", "published": now().date().isoformat(), "deadline": (now() + timedelta(days=40)).isoformat(), "body": "模拟招标正文（非真实公告）。Supply of port gantry crane. Required: business registration; ISO 9001; manufacturing license; similar project experience; manufacturer's authorization; bid-securing declaration; financial statements. 提交授权书、承诺书。所有资格要求为模拟测试。", "demo_data": True, "owner": "中东战区 · 待认领", "status": "new"}
            save("notice", notice["id"], notice)
    public_file = ROOT / "data/public_notices.json"
    if public_file.exists():
        for notice in json.loads(public_file.read_text(encoding="utf-8")):
            try:
                get("notice", notice["id"])
            except HTTPException:
                save("notice", notice["id"], notice)


def parse_date(value):
    if not value:
        return None
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return result.replace(tzinfo=timezone.utc) if result.tzinfo is None else result
    except ValueError:
        return None


def enrich(notice):
    result = dict(notice)
    deadline = parse_date(result.get("deadline"))
    result["archived"] = bool(deadline and deadline < now())
    result["deadline_status"] = "已截止" if result["archived"] else "日期待确认" if not deadline else "报名中"
    result.setdefault("owner", "海外战区 · 待认领")
    result.setdefault("status", "new")
    return result


def sources():
    cached = all_objects("source")
    return cached or [{"name": name, "status": "not_checked", "message": "点击实时刷新核验；当前使用已留存公开样本"} for name in ["World Bank", "TED", "Etimad"]]


class Search(BaseModel):
    query: str = Field(default="中东 港口起重机 近3个月", max_length=500)
    include_archived: bool = False
    include_demo: bool = True
    refresh: bool = False


@app.get("/api/bootstrap")
def bootstrap():
    seed()
    return {"notices": [enrich(item) for item in all_objects("notice")], "materials": MATERIALS, "sources": sources(), "feishu": {"connected": bool(CLI), "status": "cli_available" if CLI else "unavailable", "url": FEISHU_URL, "message": "本机已配置飞书 CLI，写入时核验权限"}, "mode": "规则解析 · 本地演示", "company": COMPANY}


@app.get("/api/demo-source")
def demo_source():
    return {"demo_data": True, "body": get("notice", "demo_1")["body"], "message": "内部模拟招标样例，不代表真实采购"}


@app.post("/api/search")
def search(request: Search):
    seed()
    if request.refresh:
        from src.fetch_sources import refresh_sources
        refreshed = refresh_sources()
        for notice in refreshed["notices"]:
            try:
                previous_notice = get("notice", notice["id"])
            except HTTPException:
                previous_notice = {}
            notice["owner"] = previous_notice.get("owner", notice.get("owner", "海外战区 · 待认领"))
            notice["status"] = previous_notice.get("status", notice.get("status", "new"))
            save("notice", notice["id"], notice)
        for index, status in enumerate(refreshed["statuses"]):
            save("source", str(index), status)
    market = next((name for name in MARKETS if name in request.query), None)
    product = next((name for name in PRODUCTS if name in request.query), None)
    days_match = re.search(r"近\s*(\d+)\s*(天|个月|月|年)", request.query)
    days = int(days_match[1]) * {"天": 1, "个月": 30, "月": 30, "年": 365}[days_match[2]] if days_match else None
    intent = {"market": market or "全部市场", "countries": MARKETS.get(market, []), "product": product or "起重设备", "keywords": PRODUCTS.get(product, ["crane", "hoist", "起重机"]), "days": days, "parser": "规则解析"}
    leads = []
    for notice in all_objects("notice"):
        item = enrich(notice)
        text = (item["title"] + " " + item["body"]).lower()
        if (item["archived"] and not request.include_archived) or (item["demo_data"] and not request.include_demo):
            continue
        if market and not any(alias in item["country"] for alias in MARKETS[market]):
            continue
        if days and item.get("published") and item["published"][:10] < (now() - timedelta(days=days)).date().isoformat():
            continue
        hits = [word for word in intent["keywords"] if word in text]
        if not hits or any(word in text for word in ["truck-mounted", "crane hire", "tower crane"]):
            continue
        item["score"] = min(100, 60 + len(hits) * 10)
        item["为什么相关"] = "命中 " + "、".join(hits) + ("；市场匹配" if market else "")
        item["match_reason"] = item["为什么相关"]
        leads.append(item)
    return {"intent": intent, "notices": sorted(leads, key=lambda item: item["score"], reverse=True), "sources": sources()}


class ImportedNotice(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    body: str = Field(min_length=30, max_length=200000)
    country: str = Field(default="待确认", max_length=80)
    buyer: str = Field(default="待确认", max_length=200)
    deadline: str | None = None
    source_url: str = Field(default="", max_length=2000)

    @field_validator("deadline")
    @classmethod
    def valid_deadline(cls, value):
        if value and (not parse_date(value) or not re.search(r"(?:Z|[+-]\d\d:\d\d)$", value)):
            raise ValueError("截止时间必须为带时区的 ISO 时间")
        return value

    @field_validator("source_url")
    @classmethod
    def valid_url(cls, value):
        if value and not value.startswith(("https://", "http://")):
            raise ValueError("来源仅支持 http/https 链接")
        return value


@app.post("/api/import", status_code=201)
def import_notice(request: ImportedNotice):
    data = request.model_dump()
    identifier = "import_" + hashlib.sha256((data["body"] + data["source_url"]).encode()).hexdigest()[:16]
    data.update(id=identifier, demo_data=not bool(data["source_url"]), source="用户录入 · 来源未核验", published=None, provenance="user_supplied")
    save("notice", identifier, data)
    audit("import", identifier, {"source_url": data["source_url"]})
    return enrich(data)


class ClaimRequest(BaseModel):
    owner: str = Field(min_length=1, max_length=80)


@app.post("/api/notices/{identifier}/claim")
def claim(identifier: str, request: ClaimRequest):
    notice = get("notice", identifier)
    notice.update(owner=request.owner, status="claimed")
    save("notice", identifier, notice)
    audit("claim", identifier, request.model_dump())
    return notice


def match_material(requirement, deadline):
    material = next((item for item in MATERIALS if item["type"] == requirement["type"]), None)
    status, reason = "red", "资料库缺失，需补充"
    if requirement["type"] in {"authorization", "declaration"}:
        status, reason = "yellow", "已生成文书草稿，待核验签章"
    if material:
        expiry = parse_date(material.get("valid_until"))
        if expiry and deadline and expiry.date() < deadline.date():
            status, reason = "red", "投标截止日前已过期"
        elif not material.get("verified") or not deadline:
            status, reason = "yellow", "资料或截止时间待核验；公开业绩不等于合同证明"
        elif expiry and expiry.date() <= (deadline + timedelta(days=30)).date():
            status, reason = "yellow", "截止日起30天内到期"
        else:
            status, reason = "green", "模拟台账已匹配，在截止日有效"
    return {"id": requirement["id"], "label": requirement["label"], "status": status, "reason": reason, "material": material}


@app.post("/api/notices/{identifier}/analyze")
def analyze(identifier: str):
    notice = get("notice", identifier)
    requirements = []
    for kind, (label, pattern) in PATTERNS.items():
        match = re.search(pattern, notice["body"], re.I)
        if match:
            quote = notice["body"][max(0, match.start() - 40):match.end() + 70]
            requirements.append({"id": kind, "type": kind, "label": label, "quote": quote, "source": {"url": notice["source_url"], "doc": notice["title"], "locator": f"字符 {match.start()}"}})
    if not requirements:
        requirements.append({"id": "manual", "type": "manual", "label": "资格附件待人工解读", "quote": notice["body"][:180], "source": {"url": notice["source_url"], "doc": notice["title"]}})
    checklist = [match_material(item, parse_date(notice.get("deadline"))) for item in requirements]
    blocked = notice["demo_data"] and notice["buyer"] == "DEMO SANCTIONED PORT LTD"
    due = {"level": "blocked" if blocked else "unknown", "score": 100 if blocked else None, "confidence": "partial", "rule_version": "demo-1.0", "data_gaps": ["实时制裁名单未接入", "多边银行禁入名单未接入", "主体工商与国别风险待核验", "新闻检索未执行"], "rules": [{"id": "DD-01", "result": "命中虚构制裁夹具，一票否决" if blocked else "未核验，不代表无风险", "score": 100 if blocked else None, "source": "本地虚构测试夹具" if blocked else "暂无"}], "demo_data": bool(blocked)}
    docs = []
    for name, description in [("授权书_中文", "授权办理本项目的报名资料整理；权限、签章及授权范围须由企业核验。"), ("承诺书_中文", "所有申报材料应真实完整；本稿不替代正式投标保证声明。"), ("Authorization_EN", "Manufacturer authorization DRAFT. Scope and signatory must be verified by the manufacturer."), ("Declaration_EN", "Declaration DRAFT. Verify the exact bid-securing form and legal obligations before signature.")]:
        content = f"模拟数据 · 文书草稿 · 待签章\n{name}\n项目：{notice['title']}\n招标人：{notice['buyer']}\n公司：{COMPANY['name_en'] if name.endswith('EN') else COMPANY['name']}\n代表：{COMPANY['representative']}\n截止时间：{notice.get('deadline') or '【待补：截止时间】'}\n{description}\n签字：【待补：签字】\n盖章：【待补：盖章】\n来源：{notice['source_url']}"
        docs.append({"name": name, "content": content})
    case_id = "case_" + uuid.uuid4().hex[:16]
    case = {"id": case_id, "notice": enrich(notice), "requirements": requirements, "checklist": checklist, "due_diligence": due, "documents": docs, "review": {"status": "pending"}, "company": COMPANY, "owner": notice.get("owner", "待认领"), "demo_data": True, "created_at": now().isoformat(), "analysis_mode": "本地关键词规则抽取，复杂资格要求仍需人工核验", "feishu": None}
    save("case", case_id, case)
    audit("analyze", case_id, {"notice_id": identifier, "requirements": len(requirements)})
    return case


@app.get("/api/cases/{identifier}")
def case_detail(identifier: str):
    return get("case", identifier)


class Review(BaseModel):
    decision: str
    reviewer: str = Field(min_length=1, max_length=80)
    comment: str = Field(min_length=5, max_length=3000)
    acknowledged: bool = False


@app.post("/api/cases/{identifier}/review")
def review(identifier: str, request: Review):
    with LOCK:
        case = get("case", identifier)
        if request.decision not in {"approved", "rejected"}:
            raise HTTPException(422, "复核决定无效")
        if not request.reviewer.strip() or not request.comment.strip():
            raise HTTPException(422, "请填写复核人与意见")
        if request.decision == "approved" and (not request.acknowledged or case["due_diligence"]["level"] == "blocked"):
            raise HTTPException(409, "请先确认所有缺口；一票否决项目禁止放行")
        case["review"] = {**request.model_dump(), "status": request.decision, "time": now().isoformat(), "scope": "仅内部模拟演示包，缺失资料仍须补齐"}
        save("case", identifier, case)
        audit("review", identifier, case["review"])
        return case


@app.get("/api/cases/{identifier}/download")
def download(identifier: str):
    case = get("case", identifier)
    if case["review"]["status"] != "approved":
        raise HTTPException(409, "未经复核不能导出")
    from src.exports import build_package
    path = build_package(case, RUNTIME / "packages" / identifier)
    audit("export", identifier, {"filename": path.name})
    return FileResponse(path, filename=f"{identifier}_模拟材料包.zip", media_type="application/zip")


def lark(arguments):
    if not CLI:
        raise HTTPException(503, "未安装 lark-cli，请先在本机连接飞书")
    try:
        completed = subprocess.run([CLI, *arguments], capture_output=True, text=True, encoding="utf-8", timeout=50, shell=False)
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "飞书请求超时，请检查连接后重试")
    try:
        payload = json.loads(completed.stdout or completed.stderr)
    except ValueError:
        raise HTTPException(502, "飞书 CLI 无法返回数据，请运行 lark-cli doctor")
    if completed.returncode or not payload.get("ok", True):
        raise HTTPException(502, {"message": "飞书操作失败", "error": payload.get("error", payload.get("message", "检查本机授权"))})
    return payload


@app.post("/api/cases/{identifier}/feishu")
def sync_feishu(identifier: str):
    with LOCK:
        case = get("case", identifier)
        notice = case["notice"]
        key = notice["id"]
        fields = {"商机名称": notice["title"], "项目ID": key, "国家": notice["country"], "负责人": case["owner"], "截止时间": notice.get("deadline") or "待确认", "复核状态": case["review"]["status"], "风险": case["due_diligence"]["level"] + " · 数据不足需人工复核", "数据类型": "模拟材料包 / " + ("模拟公告" if notice["demo_data"] else "公开公告"), "来源": notice["source_url"]}
        try:
            previous = get("feishu", key)
        except HTTPException:
            previous = None
        if not previous:
            try:
                remote = lark(["base", "+record-search", "--base-token", BASE_TOKEN, "--table-id", TABLE_ID, "--keyword", key, "--search-field", "项目ID", "--field-id", "项目ID", "--limit", "5"])
                rows = remote.get("data", {}).get("data", [])
                record_ids = remote.get("data", {}).get("record_id_list", [])
                if rows and record_ids:
                    previous = {"record_id": record_ids[0], "recovered": True}
            except HTTPException:
                pass
        args = ["base", "+record-upsert", "--base-token", BASE_TOKEN, "--table-id", TABLE_ID, "--json", json.dumps(fields, ensure_ascii=False)]
        if previous:
            args += ["--record-id", previous["record_id"]]
        result = lark(args)
        data = result.get("data", {})
        record = data.get("record", data)
        record_ids = record.get("record_id_list") or []
        record_id = record.get("id") or record.get("record_id") or (record_ids[0] if record_ids else None) or (previous or {}).get("record_id")
        if not record_id:
            raise HTTPException(502, "已写入但缺少记录ID，请检查飞书表，避免重复操作")
        sync = {"url": FEISHU_URL, "record_id": record_id, "synced_at": now().isoformat(), "updated": bool(previous)}
        save("feishu", key, sync)
        if not (previous or {}).get("message_id"):
            try:
                identity = lark(["whoami"])
                user_id = identity.get("onBehalfOf", {}).get("openId")
                if user_id:
                    card = {"header": {"title": {"tag": "plain_text", "content": "卫华招投标助手 · MVP测试"}, "template": "red"}, "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": f"**{notice['title']}**\n模拟材料包测试｜负责人：{case['owner']}\n风险：{case['due_diligence']['level']}（数据不足需人工核验）\n复核：{case['review']['status']}\n[打开海外标讯表]({FEISHU_URL})"}}]}
                    sent = lark(["im", "+messages-send", "--user-id", user_id, "--msg-type", "interactive", "--content", json.dumps(card, ensure_ascii=False), "--idempotency-key", hashlib.sha256(key.encode()).hexdigest()[:40]])
                    sync["message_id"] = sent.get("data", {}).get("message_id") or sent.get("data", {}).get("message", {}).get("message_id")
                    sync["message_status"] = "sent"
            except HTTPException as error:
                sync["message_status"] = "failed"
                sync["message_error"] = str(error.detail)
        else:
            sync["message_id"] = previous["message_id"]
            sync["message_status"] = "already_sent"
        save("feishu", key, sync)
        case["feishu"] = sync
        save("case", identifier, case)
        audit("feishu_sync", identifier, sync)
        return sync


@app.get("/api/audit")
def audit_list():
    with connection() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM audit ORDER BY id DESC LIMIT 100")]


seed()
WEB = ROOT / "src/web"
WEB.mkdir(parents=True, exist_ok=True)
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")
