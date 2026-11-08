import io
import json
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

from src.server.main import app, match_material, now
from datetime import timedelta


client = TestClient(app)


def test_bootstrap_has_public_and_demo_notices():
    response = client.get("/api/bootstrap")
    assert response.status_code == 200
    payload = response.json()
    assert payload["notices"]
    assert any(item["demo_data"] is False for item in payload["notices"])
    assert any(item["demo_data"] is True for item in payload["notices"])
    assert "connected" in payload["feishu"]


def test_search_filters_crane_relevance_and_returns_source():
    response = client.post("/api/search", json={"query": "中东 港口起重机 近3个月"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"]["product"] == "港口起重机"
    assert payload["notices"]
    assert all(item["source_url"] for item in payload["notices"])
    assert all("为什么相关" in item for item in payload["notices"])


def test_market_alias_matches_mongolia_public_notice():
    response = client.post("/api/search", json={"query": "中亚 起重机", "include_archived": True, "include_demo": False})
    assert response.status_code == 200
    assert any(item["country"] == "蒙古国" for item in response.json()["notices"])


def test_analyze_review_and_download_requires_review():
    notice_id = client.get("/api/bootstrap").json()["notices"][0]["id"]
    analysis = client.post(f"/api/notices/{notice_id}/analyze")
    assert analysis.status_code == 200
    case = analysis.json()
    assert case["checklist"]
    assert case["requirements"]
    assert case["due_diligence"]["confidence"] in {"full", "partial"}
    blocked = client.get(f"/api/cases/{case['id']}/download")
    assert blocked.status_code == 409

    review = client.post(
        f"/api/cases/{case['id']}/review",
        json={
            "decision": "approved",
            "reviewer": "测试复核人",
            "comment": "已确认模拟数据、缺失材料和风险项。",
            "acknowledged": True,
        },
    )
    assert review.status_code == 200
    download = client.get(f"/api/cases/{case['id']}/download")
    assert download.status_code == 200
    with zipfile.ZipFile(io.BytesIO(download.content)) as archive:
        names = set(archive.namelist())
    assert "TenderPackage.json" in names
    assert "Opportunity.json" in names
    assert any(name.endswith("清单.xlsx") for name in names)


def test_import_public_notice_marks_source_as_public():
    response = client.post(
        "/api/import",
        json={
            "title": "Public sample overhead crane tender",
            "body": "Supply, Delivery, Inspection, Testing, Commissioning and Handover of Cranes. Deadline 15 Nov 2026.",
            "country": "Yemen",
            "buyer": "UNOPS",
            "deadline": "2026-11-15T09:00:00Z",
            "source_url": "https://www.ungm.org/Public/Notice/272359",
        },
    )
    assert response.status_code == 201
    assert response.json()["demo_data"] is False


def test_sanction_demo_cannot_be_approved():
    case = client.post("/api/notices/demo_2/analyze").json()
    assert case["due_diligence"]["level"] == "blocked"
    response = client.post(f"/api/cases/{case['id']}/review", json={"decision": "approved", "reviewer": "测试员", "comment": "测试强制放行阻断", "acknowledged": True})
    assert response.status_code == 409


def test_material_validity_against_deadline_and_unknown():
    deadline = now() + timedelta(days=40)
    assert match_material({"id": "x", "type": "permit", "label": "许可证"}, deadline)["status"] == "red"
    assert match_material({"id": "x", "type": "iso", "label": "ISO"}, deadline)["status"] == "green"
    assert match_material({"id": "x", "type": "iso", "label": "ISO"}, now() + timedelta(days=350))["status"] == "yellow"
    assert match_material({"id": "x", "type": "iso", "label": "ISO"}, None)["status"] == "yellow"
    assert match_material({"id": "x", "type": "missing", "label": "未知"}, deadline)["status"] == "red"


def test_extracted_evidence_is_in_original_and_unknown_is_not_low_risk():
    case = client.post("/api/notices/demo_1/analyze").json()
    assert all(item["quote"] in case["notice"]["body"] for item in case["requirements"])
    assert case["due_diligence"]["score"] is None
    assert case["due_diligence"]["level"] == "unknown"


def test_review_rejection_and_missing_ack_block_download():
    case = client.post("/api/notices/demo_1/analyze").json()
    payload = {"decision": "approved", "reviewer": "测试员", "comment": "测试没有勾选风险确认", "acknowledged": False}
    assert client.post(f"/api/cases/{case['id']}/review", json=payload).status_code == 409
    payload["decision"] = "rejected"
    assert client.post(f"/api/cases/{case['id']}/review", json=payload).status_code == 200
    assert client.get(f"/api/cases/{case['id']}/download").status_code == 409


def test_invalid_date_and_unsafe_source_rejected():
    payload = {"title": "测试导入", "body": "模拟正文" * 20, "deadline": "not-a-date"}
    assert client.post("/api/import", json=payload).status_code == 422
    payload.update(deadline=None, source_url="javascript:alert(1)")
    assert client.post("/api/import", json=payload).status_code == 422

