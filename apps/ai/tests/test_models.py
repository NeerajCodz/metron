from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from metron_ai.main import app
from metron_ai.models import (
    LiquidationRequest,
    RegimeRequest,
    RiskFeatures,
    SimulationRequest,
    StressScenario,
)
from metron_ai.risk_model import predict_liquidation, predict_regime
from metron_ai.settings import get_settings
from metron_ai.simulator import run_simulation


@pytest.fixture
def features() -> RiskFeatures:
    return RiskFeatures(
        collateral_usd=Decimal("10000"),
        debt_usd=Decimal("5000"),
        liquidation_threshold_bps=8000,
        volatility_bps=500,
        stablecoin_deviation_bps=20,
        protocol_risk_bps=100,
        net_delta_wad=10**17,
        health_factor_wad=None,
    )


def test_liquidation_prediction_is_bounded_and_deterministic(features: RiskFeatures) -> None:
    request = LiquidationRequest(
        position_id="position-1",
        trace_id="trace-1",
        features=features,
        horizons_days=[1, 7, 30],
    )
    first = predict_liquidation(request, 1_700_000_000)
    second = predict_liquidation(request, 1_700_000_000)
    assert first == second
    assert first.prediction_id == second.prediction_id
    assert all(0 <= probability <= 10_000 for probability in first.horizons.values())
    assert first.horizons["30"] >= first.horizons["1"]


def test_regime_probabilities_sum_to_ten_thousand(features: RiskFeatures) -> None:
    prediction = predict_regime(
        RegimeRequest(position_id="position-1", trace_id="trace-2", features=features),
        1_700_000_000,
    )
    assert sum(prediction.probabilities_bps.values()) == 10_000
    assert prediction.selected_regime in prediction.probabilities_bps


def test_stress_simulation_exposes_adverse_health_change(features: RiskFeatures) -> None:
    request = SimulationRequest(
        position_id="position-1",
        trace_id="trace-3",
        features=features,
        scenarios=[
            StressScenario(
                eth_price_shock_bps=-3000,
                stablecoin_depeg_bps=500,
                dex_liquidity_shock_bps=2000,
                volatility_multiplier_bps=20_000,
                gas_multiplier_bps=20_000,
                lending_utilization_shock_bps=1000,
            )
        ],
    )
    result = run_simulation(request, 1_700_000_000)
    assert result.scenarios[0].health_factor_wad < 2 * 10**18
    assert result.scenarios[0].liquidation_probability_bps >= 0
    assert result.scenarios[0].assumptions


@pytest.mark.asyncio
async def test_prediction_endpoint_requires_service_token(
    monkeypatch: pytest.MonkeyPatch, features: RiskFeatures
) -> None:
    monkeypatch.delenv("METRON_AI_SERVICE_TOKEN", raising=False)
    get_settings.cache_clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/v1/risk/liquidation",
            json={
                "position_id": "position-1",
                "trace_id": "trace-4",
                "features": features.model_dump(mode="json"),
                "horizons_days": [1],
            },
        )
    assert response.status_code == 503
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_prediction_endpoint_returns_versioned_output(
    monkeypatch: pytest.MonkeyPatch, features: RiskFeatures
) -> None:
    monkeypatch.setenv("METRON_AI_SERVICE_TOKEN", "t" * 32)
    get_settings.cache_clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/v1/risk/liquidation",
            headers={"x-metron-service-token": "t" * 32},
            json={
                "position_id": "position-1",
                "trace_id": "trace-5",
                "features": features.model_dump(mode="json"),
                "horizons_days": [1],
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "1.0.0"
    assert body["trace_id"] == "trace-5"
    get_settings.cache_clear()
