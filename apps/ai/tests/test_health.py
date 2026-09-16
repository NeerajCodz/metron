import pytest
from httpx import ASGITransport, AsyncClient

from metron_ai.main import app


@pytest.mark.asyncio
async def test_health_reports_service_identity() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "metron-ai",
        "environment": "development",
    }
