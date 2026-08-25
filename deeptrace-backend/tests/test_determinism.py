import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_risks_determinism():
    """
    Test that calling GET /api/v1/risks twice in a row with no state change
    returns byte-identical JSON.
    """
    response1 = client.get("/api/v1/risks")
    assert response1.status_code == 200
    
    response2 = client.get("/api/v1/risks")
    assert response2.status_code == 200
    
    assert response1.content == response2.content, "Risks API is not deterministic"
