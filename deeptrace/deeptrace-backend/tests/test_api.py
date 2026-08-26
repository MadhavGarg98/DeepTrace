import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "DeepTrace Backend is running."}

def test_get_analytics_summary():
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_nodes"] > 0
    assert data["total_edges"] > 0
    assert data["total_tier1_suppliers"] > 0

def test_get_risks():
    response = client.get("/api/v1/risks")
    assert response.status_code == 200
    data = response.json()
    assert len(data["risks"]) > 0
    
def test_get_risk_by_node_not_found():
    response = client.get("/api/v1/risks/nonexistent-node")
    assert response.status_code == 404

def test_simulate_disruption():
    response = client.post("/api/v1/disruptions/simulate", json={"node_id": "infineonco-my"})
    assert response.status_code == 200
    data = response.json()
    assert data["report"]["disrupted_node"] == "infineonco-my"
    assert len(data["report"]["affected_tier1_suppliers"]) > 0

def test_simulate_disruption_not_found():
    response = client.post("/api/v1/disruptions/simulate", json={"node_id": "nonexistent-node"})
    assert response.status_code == 404

def test_chat():
    response1 = client.post("/api/v1/chat", json={"message": "What is the biggest risk?"})
    assert response1.status_code == 200
    data1 = response1.json()
    assert "biggest hidden risk" in data1["answer"]

    response2 = client.post("/api/v1/chat", json={"message": "Tell me about FiberTex Japan"})
    assert response2.status_code == 200
    data2 = response2.json()
    assert "FiberTex Japan" in data2["answer"]
    assert "not part of any detected hidden risk" in data2["answer"]
    
    # ensure they are different
    assert data1["answer"] != data2["answer"]


def test_chat_greeting_does_not_trigger_risk_summary():
    response = client.post("/api/v1/chat", json={"message": "hi"})
    assert response.status_code == 200

    data = response.json()
    assert "biggest hidden risk" not in data["answer"].lower()
    assert data["top_risk"] is None
    assert data["evidence"] == []


def test_chat_greeting_variant_does_not_trigger_risk_summary():
    response = client.post("/api/v1/chat", json={"message": "hii"})
    assert response.status_code == 200

    data = response.json()
    assert "biggest hidden risk" not in data["answer"].lower()
    assert data["top_risk"] is None
    assert data["evidence"] == []
