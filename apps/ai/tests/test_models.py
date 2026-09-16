from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from metron_ai.cascade import simulate_cascade
from metron_ai.main import app
from metron_ai.models import (
    CascadePosition,
    CascadeRequest,
    LiquidationRequest,
    LiquidityEstimateRequest,
    OptimizationOpportunity,
    OptimizationRequest,
    RecommendationRequest,
    RecoveryPolicy,
    RecoveryRequest,
    RegimeRequest,
    RiskFeatures,
    ScenarioDraftRequest,
    SimulationRequest,
    StressScenario,
)
from metron_ai.optimization import estimate_liquidity, optimize_allocation
from metron_ai.recommendations import parse_scenario_draft, recommend
from metron_ai.recovery import rank_recovery
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

def test_recovery_ranking_honors_user_policy(features: RiskFeatures) -> None:
    request = RecoveryRequest(
        position_id="position-2",
        trace_id="trace-recovery",
        chain_id=421614,
        protocol="aave-v3",
        asset="0x2222222222222222222222222222222222222222",
        features=features,
        policy=RecoveryPolicy(
            allowed_action_types={"repay_debt", "move_to_safe_state"},
            max_collateral_sale_bps=0,
            max_slippage_bps=50,
            allow_hedging=False,
            allow_liquidity_withdrawal=False,
        ),
    )
    result = rank_recovery(request, 1_700_000_000)
    assert {candidate.type for candidate in result.candidates} == {
        "repay_debt",
        "move_to_safe_state",
    }
    assert any(item["reasons"] for item in result.rejected)
    assert result.candidates[0].post_action_liquidation_probability_bps <= 10_000


def test_cascade_reports_depth_impact_and_affected_positions() -> None:
    request = CascadeRequest(
        trace_id="trace-cascade",
        forced_selling_usd=Decimal("5000"),
        market_depth_usd=Decimal("10000"),
        price_impact_slope_bps=1000,
        positions=[
            CascadePosition(
                position_id="safe",
                collateral_usd=Decimal("10000"),
                debt_usd=Decimal("1000"),
                liquidation_threshold_bps=8000,
            ),
            CascadePosition(
                position_id="unsafe",
                collateral_usd=Decimal("1000"),
                debt_usd=Decimal("900"),
                liquidation_threshold_bps=8000,
            ),
        ],
    )
    result = simulate_cascade(request, 1_700_000_000)
    assert result.consumed_depth_usd == Decimal("5000")
    assert result.secondary_price_impact_bps == 500
    assert result.newly_liquidatable_positions == ["unsafe"]
    assert result.secondary_exposure_usd == Decimal("900.000000")


def test_recommendation_never_escapes_policy() -> None:
    result = recommend(
        RecommendationRequest(
            trace_id="trace-recommendation",
            candidate_action_types=["adjust_hedge", "repay_debt"],
            allowed_action_types={"repay_debt"},
            accepted_history={"adjust_hedge": 100, "repay_debt": 0},
            rejected_history={},
        )
    )
    assert result.recommended_action_type == "repay_debt"

def test_liquidity_estimate_and_allocation_are_bounded() -> None:
    estimate = estimate_liquidity(
        LiquidityEstimateRequest(
            trace_id="trace-liquidity",
            pool_depth_usd=Decimal("100000"),
            trade_size_usd=Decimal("10000"),
            fee_bps=30,
            volatility_bps=500,
            gas_usd=Decimal("2"),
        )
    )
    assert estimate.price_impact_bps == 1000
    assert 0 <= estimate.failure_probability_bps <= 10_000
    allocation = optimize_allocation(
        OptimizationRequest(
            trace_id="trace-optimization",
            capital_usd=Decimal("1000"),
            target_delta_wad=0,
            delta_tolerance_wad=10**16,
            max_risk_bps=500,
            opportunities=[
                OptimizationOpportunity(
                    opportunity_id="safe",
                    expected_yield_bps=900,
                    risk_bps=200,
                    cost_bps=50,
                    delta_wad=0,
                    capacity_usd=Decimal("1000"),
                ),
                OptimizationOpportunity(
                    opportunity_id="risky",
                    expected_yield_bps=2000,
                    risk_bps=900,
                    cost_bps=10,
                    delta_wad=10**18,
                    capacity_usd=Decimal("1000"),
                ),
            ],
        )
    )
    assert [item.opportunity_id for item in allocation.allocations] == ["safe"]
    assert allocation.rejected_opportunities[0]["reason"] == "RISK_LIMIT_EXCEEDED"

def test_natural_language_scenario_is_an_unapproved_draft() -> None:
    draft = parse_scenario_draft(
        ScenarioDraftRequest(
            trace_id="trace-draft",
            text="simulate a 20% crash, 3% depeg and 10% liquidity shock",
        )
    )
    assert draft.requires_approval is True
    assert draft.scenario.eth_price_shock_bps == -2000
    assert draft.scenario.stablecoin_depeg_bps == 300
    assert draft.scenario.dex_liquidity_shock_bps == 1000
