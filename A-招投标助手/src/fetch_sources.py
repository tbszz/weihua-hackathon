"""Public crane notices; requests is the only non-standard-library dependency.

refresh_sources() returns {notices: list, statuses: list}. Each source has an
independent 20-second budget. Cache fallbacks retain their original fetched_at.
Run ``python -B src/fetch_sources.py`` to refresh and print source statuses.
"""
from __future__ import annotations

import json
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, wait
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE_PATH = ROOT / "data/public_notices.json"
SNAPSHOT_DIR = ROOT / "data/sources"
SOURCE_TIMEOUT = 20.0
WORLD_BANK_URL = "https://search.worldbank.org/api/v2/procnotices?format=json&qterm=crane&rows=20"
TED_URL = "https://api.ted.europa.eu/v3/notices/search"
ETIMAD_URL = "https://tenders.etimad.sa/Tender/AllTendersForVisitor"
UNGM_URLS = [f"https://www.ungm.org/Public/Notice/{n}" for n in (252462, 272359)]
OYU_URL = "https://www.ot.mn/en/procurement/eoi/supply-of-epc-service-for-60-ton-gantry-crane-installation-at-marshalling-yard"
TED_BODY = {
    "query": "classification-cpv=42414000",
    "fields": ["publication-number", "notice-title", "publication-date",
               "deadline-receipt-tender-date", "buyer-name", "place-of-performance"],
    "limit": 10,
}
_REFRESH_LOCK = threading.Lock()
_COUNTRIES = {
    "Liberia": "利比里亚", "Austria": "奥地利", "Mongolia": "蒙古国",
    "Zambia": "赞比亚", "Sri Lanka": "斯里兰卡", "Malawi": "马拉维",
    "Madagascar": "马达加斯加", "Western and Central Africa": "西非和中非",
    "Suriname": "苏里南", "Indonesia": "印度尼西亚", "Uganda": "乌干达",
    "Bangladesh": "孟加拉国", "Ukraine": "乌克兰", "Rwanda": "卢旺达",
    "Mali": "马里", "India": "印度", "Saudi Arabia": "沙特阿拉伯",
    "AT": "奥地利", "BE": "比利时", "BG": "保加利亚", "CH": "瑞士",
    "CZ": "捷克", "DE": "德国", "DK": "丹麦", "EE": "爱沙尼亚",
    "ES": "西班牙", "FI": "芬兰", "FR": "法国", "GB": "英国",
    "GR": "希腊", "HU": "匈牙利", "IE": "爱尔兰", "IT": "意大利",
    "LT": "立陶宛", "LU": "卢森堡", "LV": "拉脱维亚", "MT": "马耳他",
    "NL": "荷兰", "NO": "挪威", "PL": "波兰", "PT": "葡萄牙",
    "RO": "罗马尼亚", "SE": "瑞典", "SI": "斯洛文尼亚", "SK": "斯洛伐克",
    "TR": "土耳其", "UA": "乌克兰",
}
for _codes, _name in [
    ("AT AUT", "奥地利"), ("BE BEL", "比利时"), ("BG BGR", "保加利亚"),
    ("HR HRV", "克罗地亚"), ("CY CYP", "塞浦路斯"), ("CZ CZE", "捷克"),
    ("DK DNK", "丹麦"), ("EE EST", "爱沙尼亚"), ("FI FIN", "芬兰"),
    ("FR FRA", "法国"), ("DE DEU", "德国"), ("EL GR GRC", "希腊"),
    ("HU HUN", "匈牙利"), ("IE IRL", "爱尔兰"), ("IT ITA", "意大利"),
    ("LV LVA", "拉脱维亚"), ("LT LTU", "立陶宛"), ("LU LUX", "卢森堡"),
    ("MT MLT", "马耳他"), ("NL NLD", "荷兰"), ("PL POL", "波兰"),
    ("PT PRT", "葡萄牙"), ("RO ROU", "罗马尼亚"), ("SK SVK", "斯洛伐克"),
    ("SI SVN", "斯洛文尼亚"), ("ES ESP", "西班牙"), ("SE SWE", "瑞典"),
    ("NO NOR", "挪威"), ("CH CHE", "瑞士"), ("UK GB GBR", "英国"),
    ("IS ISL", "冰岛"), ("TR TUR", "土耳其"), ("UA UKR", "乌克兰"),
]:
    _COUNTRIES.update(dict.fromkeys(_codes.split(), _name))


def _now():
    return datetime.now(timezone.utc).isoformat()


class _TextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.hidden += 1
        if tag in {"p", "div", "br", "li", "h1", "h2", "h3", "tr"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"}:
            self.hidden = max(0, self.hidden - 1)
        if tag in {"p", "div", "li", "h1", "h2", "h3", "tr"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def _text(html):
    parser = _TextParser()
    parser.feed(html)
    return "\n".join(line for line in
                     (re.sub(r"\s+", " ", s).strip() for s in "".join(parser.parts).splitlines())
                     if line)


def _country(raw):
    values = _strings(raw)
    names = []
    for value in values:
        # Place-of-performance may contain a NUTS code rather than a country.
        name = _COUNTRIES.get(value) or _COUNTRIES.get(value[:2])
        if not name:
            name = value if re.search(r"[\u4e00-\u9fff]", value) else f"未识别（{value}）"
        if name not in names:
            names.append(name)
    return "、".join(names) or "未注明"


def _strings(value):
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, dict):
        preferred = value.get("eng") or value.get("en")
        return _strings(preferred) if preferred else [s for v in value.values() for s in _strings(v)]
    if isinstance(value, list):
        return [s for v in value for s in _strings(v)]
    return []


def _date(value):
    for raw in _strings(value):
        match = re.match(r"^(\d{4}-\d{2}-\d{2})(?:$|T|[+-])", raw)
        try:
            return datetime.strptime(match[1] if match else raw, "%Y-%m-%d" if match else "%d-%b-%Y").date().isoformat()
        except ValueError:
            continue
    return None


def _aware_deadline(value):
    """Never supply an implicit timezone or interpret a date as midnight."""
    parsed = []
    for raw in _strings(value):
        if "T" not in raw and not re.search(r"\d \d{2}:\d{2}", raw):
            return None
        try:
            stamp = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
        if stamp.tzinfo is None:
            return None
        parsed.append(stamp.isoformat())
    return parsed[0] if len(set(parsed)) == 1 else None


def _notice(identifier, title, country, buyer, deadline, published, url, source, body, fetched, snapshot):
    return dict(id=identifier, title=title, country=country, buyer=buyer,
                deadline=deadline, published=published, source_url=url,
                source=source, body=body, demo_data=False, fetched_at=fetched,
                snapshot_path=snapshot, cache_fallback=False)


def _request(method, url, end, captures, **kwargs):
    remaining = end - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("source exceeded 20-second budget")
    started = _now()
    response = requests.request(method, url, timeout=remaining,
                                headers={"User-Agent": "CranePublicNotices/1.0", "Accept": "application/json,text/html;q=0.9,*/*;q=0.8"}, **kwargs)
    response.encoding = response.encoding or "utf-8"
    capture = dict(source_url=url, retrieved_url=response.url, method=method,
                   request_json=kwargs.get("json"), http_status=response.status_code,
                   fetched_at=started, completed_at=_now(), raw=response.text,
                   content_type=response.headers.get("Content-Type", ""))
    captures.append(capture)
    response.raise_for_status()
    return response


def _parse_ungm(raw, url, fetched, snapshot):
    text = _text(raw)
    flat = re.sub(r"\s+", " ", text)
    heading = re.search(r"<h1\b[^>]*>(.*?)</h1>", raw, re.S | re.I)
    if not heading:
        raise ValueError("UNGM notice heading missing")
    title = _text(heading[1])
    def field(label, tail):
        found = re.search(label + r"\s*:?\s*(.*?)\s*" + tail, flat)
        return found[1].strip() if found else ""
    beneficiary = field("Beneficiary countries or territories", "Registration level")
    published = _date(field("Published on", "Deadline on"))
    deadline_raw = re.search(r"Deadline on:\s*(\d{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2})\s*\(GMT\s*([+-]?\d+(?:\.\d+)?)\)", flat)
    deadline = None
    if deadline_raw:
        zone = timezone(timedelta(hours=float(deadline_raw[2])))
        deadline = datetime.strptime(deadline_raw[1], "%d-%b-%Y %H:%M").replace(tzinfo=zone).isoformat()
    # In the actual HTML, the organisation follows the first page h1.
    after_h1 = _text(raw[heading.end():])
    buyer = after_h1.split(title, 1)[0].strip()
    body_match = re.search(r"\bDescription\s+(.*?)(?:\s+(?:Documents|Contacts)\b)", flat)
    if not body_match or not beneficiary or not buyer:
        raise ValueError("UNGM content could not be parsed")
    return _notice("pub_ungm_" + url.rsplit("/", 1)[1], title, _country(beneficiary),
                   buyer, deadline, published, url, "UNGM", body_match[1], fetched, snapshot)


def _parse_oyu(raw, fetched, snapshot):
    text = _text(raw)
    heading = re.search(r"<h1\b[^>]*>(.*?)</h1>", raw, re.S | re.I)
    if not heading or "60-ton Gantry Crane" not in _text(heading[1]):
        raise ValueError("Oyu Tolgoi notice content missing")
    title = _text(heading[1])
    body = text[text.index(title):]
    body = body.split("About us", 1)[0].strip()
    match = re.search(r"Open date\s*:?\s*(\d{4})/(\d{2})/(\d{2})", body)
    published = "-".join(match.groups()) if match else None
    notice = _notice("pub_oyu_tolgoi_60t", title, "蒙古国", "Oyu Tolgoi LLC", None,
                     published, OYU_URL, "OyuTolgoi", body, fetched, snapshot)
    close = re.search(r"Close date\s*:?\s*(\d{4}/\d{2}/\d{2})", body)
    submission = re.search(r"before\s+(.*?\d{4})", body, re.S)
    notice["deadline_raw"] = close[1] if close else None
    notice["deadline_body_raw"] = re.sub(r"\s+", " ", submission[1]) if submission else None
    notice["date_note"] = "published 采用页面 Open date。顶部 Close date 与正文截止年份存在冲突或缺少明确时区，deadline 留空；两个原值均保留，未擅自更正。"
    return notice


def _parse_worldbank(data, fetched, snapshot):
    items = data.get("procnotices")
    if isinstance(items, dict):
        items = [v for v in items.values() if isinstance(v, dict)]
    if not isinstance(items, list):
        raise ValueError("World Bank procnotices is not a list/dict")
    notices = []
    for item in items:
        title = item.get("bid_description", "")
        body = _text(item.get("notice_text", ""))
        # Search is broad: exclude incidental supplier names / construction tools.
        relevant = re.search(r"\bcranes?\b|\bgrues?\b|起重机", title, re.I) or re.search(
            r"(?:\b\d+[ -]*(?:ton|tonne|t)\b.{0,70}\bcrane\b|overhead crane|gantry crane)", body, re.I)
        if not relevant or not item.get("id") or not title:
            continue
        raw_deadline = item.get("submission_deadline_date")
        # WB date is a UTC midnight date container; separate local time has no
        # reliable timezone. Preserve both source fields rather than invent one.
        notice = _notice("pub_worldbank_" + item["id"], title,
                         _country(item.get("project_ctry_name")), item.get("contact_organization") or "",
                         None, _date(item.get("noticedate")),
                         WORLD_BANK_URL,
                         "WorldBank", body, fetched, snapshot)
        notice.update(notice_type=item.get("notice_type"),
                      deadline_raw=raw_deadline, deadline_time_raw=item.get("submission_deadline_time"),
                      date_note="API 截止日期与本地时间原值保留；未确认时区，deadline 留空。" if raw_deadline else "来源未提供截止日期。")
        notices.append(notice)
    return notices


def _parse_ted(data, fetched, snapshot):
    if not isinstance(data.get("notices"), list):
        raise ValueError("TED notices is not a list")
    notices = []
    for item in data["notices"]:
        number = item.get("publication-number")
        titles = _strings(item.get("notice-title"))
        if not number or not titles:
            continue
        description = _strings(item.get("description-proc") or item.get("description-lot"))
        deadline_raw = item.get("deadline-receipt-tender-date") or item.get("deadline-receipt-tender-date-lot")
        notice = _notice("pub_ted_" + number.replace("-", "_"), titles[0],
                         _country(item.get("place-of-performance-country-lot") or item.get("place-of-performance")),
                         "; ".join(_strings(item.get("buyer-name") or item.get("organisation-name-buyer"))),
                         _aware_deadline(deadline_raw), _date(item.get("publication-date")),
                         f"https://ted.europa.eu/en/notice/-/detail/{number}", "TED",
                         "\n".join(description or titles[:1]), fetched, snapshot)
        notice.update(content_scope="description" if description else "API title only; full notice not retrieved",
                      deadline_raw=deadline_raw)
        notices.append(notice)
    return notices


def _collect(source):
    end = time.monotonic() + SOURCE_TIMEOUT
    captures, notices = [], []
    status = dict(source=source, status="ok", checked_at=_now(), fallback=False, cached=False)
    try:
        if source == "WorldBank":
            response = _request("GET", WORLD_BANK_URL, end, captures)
            notices = _parse_worldbank(response.json(), captures[-1]["fetched_at"], "")
        elif source == "TED":
            try:
                response = _request("POST", TED_URL, end, captures, json=TED_BODY)
            except requests.HTTPError as exc:
                if exc.response.status_code != 400 or "unsupported" not in exc.response.text:
                    raise
                compatible = dict(TED_BODY, fields=[
                    "publication-number", "notice-title", "publication-date",
                    "deadline-receipt-tender-date-lot", "buyer-name", "place-of-performance",
                    "place-of-performance-country-lot", "description-proc"])
                response = _request("POST", TED_URL, end, captures, json=compatible)
                status["message"] = "指定 deadline-receipt-tender-date 字段被接口拒绝（400）；改用官方支持的 -lot 字段成功。"
                status["compatibility_retry"] = True
            notices = _parse_ted(response.json(), captures[-1]["fetched_at"], "")
            for notice in notices:
                notice["_capture_index"] = len(captures) - 1
            # The supplied reference is not guaranteed to occur in the first
            # ten CPV search hits (TED currently returns historical hits first).
            target = "pub_ted_657838_2026"
            if not any(n["id"] == target for n in notices):
                try:
                    target_body = dict(TED_BODY, query="publication-number=657838-2026", limit=1,
                                       fields=["publication-number", "notice-title", "publication-date",
                                               "deadline-receipt-tender-date-lot", "buyer-name",
                                               "place-of-performance", "description-proc"])
                    response = _request("POST", TED_URL, end, captures, json=target_body)
                    target_notices = _parse_ted(response.json(), captures[-1]["fetched_at"], "")
                    for notice in target_notices:
                        notice["_capture_index"] = len(captures) - 1
                    notices.extend(target_notices)
                except Exception as exc:
                    status.update(status="partial", error=f"TED reference lookup: {type(exc).__name__}: {exc}")
        elif source == "Etimad":
            response = _request("GET", ETIMAD_URL, end, captures)
            status.update(status="degraded", reachable=True, parsed=False,
                          message="HTTPS 访客页可达；仅检测可达性，未解析公告，无实时结果（可能是访客验证页）。")
        elif source == "UNGM":
            for url in UNGM_URLS:
                try:
                    response = _request("GET", url, end, captures)
                    notices.append(_parse_ungm(response.text, url, captures[-1]["fetched_at"], ""))
                except Exception as exc:
                    status.setdefault("errors", []).append(f"{url}: {type(exc).__name__}: {exc}")
            if status.get("errors"):
                status["status"] = "partial" if notices else "error"
        elif source == "OyuTolgoi":
            response = _request("GET", OYU_URL, end, captures)
            notices = [_parse_oyu(response.text, captures[-1]["fetched_at"], "")]
        if not notices and status["status"] == "ok":
            status["status"] = "empty"
    except Exception as exc:
        status.update(status="timeout" if isinstance(exc, (TimeoutError, requests.Timeout)) else "error",
                      error=f"{type(exc).__name__}: {exc}")
        if source == "Etimad":
            status.update(reachable=False, parsed=False)
    return notices, status, captures


def _write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def _save_captures(source, captures, run_id):
    paths = []
    for index, capture in enumerate(captures):
        prefix = SNAPSHOT_DIR / f"{run_id}_{source.lower()}_{index}"
        raw_path = prefix.with_suffix(".txt")
        raw_path.write_text(capture["raw"], encoding="utf-8")
        metadata = {k: v for k, v in capture.items() if k != "raw"}
        metadata["snapshot_path"] = raw_path.relative_to(ROOT).as_posix()
        _write_json(prefix.with_suffix(".json"), metadata)
        paths.append(metadata["snapshot_path"])
    return paths


def refresh_sources() -> dict:
    """Refresh independently; always label cached records and source failures.

    Live, empty results replace that source's old cache. Failed/partial sources
    retain only missing cached records. An Etimad health check never yields any.
    Worker threads perform no disk writes, including after a timed-out refresh.
    """
    with _REFRESH_LOCK:
        cache_error = None
        try:
            cached = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            if not isinstance(cached, list):
                raise ValueError("cache must be a JSON array")
            cached = [n for n in cached if isinstance(n, dict) and n.get("demo_data") is False
                      and str(n.get("id", "")).startswith("pub_") and n.get("source_url")]
        except FileNotFoundError:
            cached = []
        except (ValueError, OSError) as exc:
            cached, cache_error = [], str(exc)
        SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
        sources = ["UNGM", "OyuTolgoi", "WorldBank", "TED", "Etimad"]
        pool = ThreadPoolExecutor(max_workers=len(sources), thread_name_prefix="public-source")
        futures = {source: pool.submit(_collect, source) for source in sources}
        done, _ = wait(futures.values(), timeout=SOURCE_TIMEOUT)
        pool.shutdown(wait=False, cancel_futures=True)
        notices, statuses = [], []
        run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "_" + uuid.uuid4().hex[:8]
        for source, future in futures.items():
            if future not in done:
                live, captures = [], []
                status = dict(source=source, status="timeout", checked_at=_now(),
                              error="source exceeded 20-second budget", fallback=False, cached=False)
            else:
                try:
                    live, status, captures = future.result()
                except Exception as exc:
                    live, captures = [], []
                    status = dict(source=source, status="error", checked_at=_now(), error=str(exc))
            paths = _save_captures(source, captures, run_id)
            for notice in live:
                if source == "UNGM":
                    index = next(i for i, c in enumerate(captures) if c["source_url"] == notice["source_url"])
                    notice["snapshot_path"] = paths[index]
                else:
                    index = notice.pop("_capture_index", len(paths) - 1)
                    notice["snapshot_path"] = paths[index] if paths else ""
                notice["cache_fallback"] = False
            fallback = []
            if status["status"] in {"error", "timeout", "partial"} and source != "Etimad":
                live_ids = {n["id"] for n in live}
                fallback = [dict(n, cache_fallback=True) for n in cached
                            if n.get("source") == source and n["id"] not in live_ids]
            status.update(live_count=len(live), cached_count=len(fallback),
                          notice_count=len(live) + len(fallback), fallback=bool(fallback),
                          cached=bool(fallback), snapshot_paths=paths)
            if cache_error:
                status["cache_error"] = cache_error
            notices.extend(live + fallback)
            statuses.append(status)
        _write_json(CACHE_PATH, notices)
        _write_json(SNAPSHOT_DIR / "refresh_status.json", statuses)
        _write_json(SNAPSHOT_DIR / f"{run_id}_extracted.json", notices)
        return {"notices": notices, "statuses": statuses}


if __name__ == "__main__":
    result = refresh_sources()
    print(json.dumps({"notice_count": len(result["notices"]), "statuses": result["statuses"]}, ensure_ascii=False, indent=2))
