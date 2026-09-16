from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

RISK_SCHEMA_VERSION: Literal["1.0.0"] = "1.0.0"
RECOVERY_SCHEMA_VERSION: Literal["1.0.0"] = "1.0.0"
FEATURE_SCHEMA_VERSION = "features-v1"
MODEL_VERSION = "risk-deterministic-v1"

MarketRegime = Literal[
    "stable", "trending", "high_volatility", "liquidity_stress", "flash_crash", "recovery"
]
class RiskFeatures(BaseModel):
    collateral_usd: Decimal = Field(ge=0)
    debt_usd: Decimal = Field(ge=0)
    liquidation_threshold_bps: int = Field(ge=0, le=10_000)
    volatility_bps: int = Field(ge=0, le=1_000_000)
    stablecoin_deviation_bps: int = Field(ge=-10_000, le=10_000)
    protocol_risk_bps: int = Field(ge=0, le=10_000)
    net_delta_wad: int
    health_factor_wad: int | None = Field(default=None, ge=0)


class LiquidationRequest(BaseModel):
    position_id: str = Field(min_length=1)
    trace_id: str = Field(min_length=1)
    features: RiskFeatures
    horizons_days: list[int] = Field(min_length=1, max_length=8)

    @field_validator("horizons_days")
    @classmethod
    def validate_horizons(cls, values: list[int]) -> list[int]:
        if any(value <= 0 for value in values) or len(set(values)) != len(values):
            raise ValueError("horizons_days must contain unique positive values")
        return values


class LiquidationPrediction(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    position_id: str
    prediction_id: str
    model_version: str = MODEL_VERSION
    feature_schema_version: str = FEATURE_SCHEMA_VERSION
    generated_at: int
    horizons: dict[str, int]
    confidence_bps: int = Field(ge=0, le=10_000)
    fallback_used: bool


class RegimeRequest(BaseModel):
    position_id: str = Field(min_length=1)
    trace_id: str = Field(min_length=1)
    features: RiskFeatures


class RegimePrediction(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    position_id: str | None = None
    model_version: str = MODEL_VERSION
    feature_schema_version: str = FEATURE_SCHEMA_VERSION
    generated_at: int
    probabilities_bps: dict[str, int]
    selected_regime: MarketRegime
    fallback_used: bool


class StressScenario(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    eth_price_shock_bps: int = Field(ge=-10_000, le=100_000)
    stablecoin_depeg_bps: int = Field(ge=-10_000, le=10_000)
    dex_liquidity_shock_bps: int = Field(ge=-10_000, le=100_000)
    volatility_multiplier_bps: int = Field(ge=0, le=1_000_000)
    gas_multiplier_bps: int = Field(ge=0, le=1_000_000)
    lending_utilization_shock_bps: int = Field(ge=-10_000, le=10_000)


class SimulationRequest(BaseModel):
    position_id: str = Field(min_length=1)
    trace_id: str = Field(min_length=1)
    features: RiskFeatures
    scenarios: list[StressScenario] = Field(min_length=1, max_length=32)


class ScenarioResult(BaseModel):
    scenario_index: int
    health_factor_wad: int
    net_delta_wad: int
    liquidation_probability_bps: int = Field(ge=0, le=10_000)
    estimated_loss_bps: int = Field(ge=0, le=100_000)
    assumptions: list[str] = Field(min_length=1)


class SimulationResponse(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    position_id: str
    model_version: str = MODEL_VERSION
    feature_schema_version: str = FEATURE_SCHEMA_VERSION
    generated_at: int
    scenarios: list[ScenarioResult]
    fallback_used: bool = False


class ExplanationRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    observed_data: list[str] = Field(min_length=1)
    deterministic_calculations: list[str] = Field(min_length=1)
    model_predictions: list[str] = Field(min_length=1)
    scenario_assumptions: list[str] = Field(min_length=1)


class ExplanationResponse(BaseModel):
    trace_id: str
    observed_data: list[str]
    deterministic_calculations: list[str]
    model_predictions: list[str]
    scenario_assumptions: list[str]

class RecoveryPolicy(BaseModel):
    allowed_action_types: set[str] = Field(min_length=1)
    max_collateral_sale_bps: int = Field(ge=0, le=10_000)
    max_slippage_bps: int = Field(ge=0, le=10_000)
    allow_hedging: bool = True
    allow_liquidity_withdrawal: bool = True


class RecoveryRequest(BaseModel):
    position_id: str = Field(min_length=1)
    trace_id: str = Field(min_length=1)
    chain_id: int = Field(gt=0)
    protocol: str = Field(min_length=1)
    asset: str | None = None
    features: RiskFeatures
    policy: RecoveryPolicy


class RecoveryAction(BaseModel):
    action_id: str = Field(min_length=1)
    type: str = Field(min_length=1)
    chain_id: int = Field(gt=0)
    asset: str | None = None
    amount: str | None = None
    collateral_sale_bps: int | None = Field(default=None, ge=0, le=10_000)
    max_slippage_bps: int = Field(ge=0, le=10_000)
    expected_cost_usd: Decimal = Field(ge=0)
    expected_loss_usd: Decimal = Field(ge=0)
    resulting_health_factor_wad: int = Field(ge=0)
    resulting_delta_wad: int
    post_action_liquidation_probability_bps: int = Field(ge=0, le=10_000)
    protocol: str = Field(min_length=1)


class RecoveryResponse(BaseModel):
    schema_version: Literal["1.0.0"] = RECOVERY_SCHEMA_VERSION
    trace_id: str
    position_id: str
    model_version: str = MODEL_VERSION
    feature_schema_version: str = FEATURE_SCHEMA_VERSION
    generated_at: int
    candidates: list[RecoveryAction]
    rejected: list[dict[str, list[str] | str]]
    fallback_used: bool


class CascadePosition(BaseModel):
    position_id: str = Field(min_length=1)
    collateral_usd: Decimal = Field(ge=0)
    debt_usd: Decimal = Field(ge=0)
    liquidation_threshold_bps: int = Field(ge=0, le=10_000)


class CascadeRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    forced_selling_usd: Decimal = Field(ge=0)
    market_depth_usd: Decimal = Field(gt=0)
    price_impact_slope_bps: int = Field(ge=0, le=100_000)
    positions: list[CascadePosition] = Field(min_length=1, max_length=1000)


class CascadeResponse(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    generated_at: int
    forced_selling_volume_usd: Decimal
    consumed_depth_usd: Decimal
    secondary_price_impact_bps: int
    newly_liquidatable_positions: list[str]
    affected_position_count: int
    secondary_exposure_usd: Decimal


class RecommendationRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    candidate_action_types: list[str] = Field(min_length=1)
    allowed_action_types: set[str] = Field(min_length=1)
    accepted_history: dict[str, int] = Field(default_factory=dict)
    rejected_history: dict[str, int] = Field(default_factory=dict)


class RecommendationResponse(BaseModel):
    trace_id: str
    recommended_action_type: str
    rationale: list[str] = Field(min_length=1)


class IntentDraftRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=4000)


class IntentDraftResponse(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    objective: dict[str, int]
    risk: dict[str, int]
    assets: list[str]
    chains: list[int]
    source_text: str
    requires_approval: bool = True

class ThresholdRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    current_liquidation_probability_bps: int = Field(ge=0, le=10_000)
    user_max_probability_bps: int = Field(ge=0, le=10_000)
    administrator_max_probability_bps: int = Field(ge=0, le=10_000)
    hysteresis_bps: int = Field(ge=0, le=10_000)


class ThresholdResponse(BaseModel):
    trace_id: str
    recommended_intervention_bps: int = Field(ge=0, le=10_000)
    intervention_required: bool
    rationale: list[str] = Field(min_length=1)

class LiquidityEstimateRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    pool_depth_usd: Decimal = Field(gt=0)
    trade_size_usd: Decimal = Field(ge=0)
    fee_bps: int = Field(ge=0, le=10_000)
    volatility_bps: int = Field(ge=0, le=1_000_000)
    gas_usd: Decimal = Field(ge=0)


class LiquidityEstimateResponse(BaseModel):
    trace_id: str
    depth_usd: Decimal
    price_impact_bps: int = Field(ge=0)
    expected_slippage_bps: int = Field(ge=0)
    gas_usd: Decimal
    failure_probability_bps: int = Field(ge=0, le=10_000)
    opportunity_decay_bps: int = Field(ge=0, le=10_000)


class OptimizationOpportunity(BaseModel):
    opportunity_id: str = Field(min_length=1)
    expected_yield_bps: int
    risk_bps: int = Field(ge=0, le=10_000)
    cost_bps: int = Field(ge=0, le=10_000)
    delta_wad: int
    capacity_usd: Decimal = Field(gt=0)


class OptimizationRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    capital_usd: Decimal = Field(gt=0)
    target_delta_wad: int
    delta_tolerance_wad: int = Field(ge=0)
    max_risk_bps: int = Field(ge=0, le=10_000)
    opportunities: list[OptimizationOpportunity] = Field(min_length=1, max_length=128)


class Allocation(BaseModel):
    opportunity_id: str
    amount_usd: Decimal = Field(gt=0)


class OptimizationResponse(BaseModel):
    trace_id: str
    allocations: list[Allocation]
    expected_net_yield_bps: int
    resulting_delta_wad: int
    rejected_opportunities: list[dict[str, str]]

class ScenarioDraftRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=4000)


class ScenarioDraftResponse(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    scenario: StressScenario
    source_text: str
    requires_approval: bool = True

class PositionAnswerRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    question: str = Field(min_length=1, max_length=1000)
    indexed_data: dict[str, str | int | Decimal] = Field(min_length=1)
    simulation_outputs: dict[str, str | int | Decimal] = Field(default_factory=dict)


class PositionAnswerResponse(BaseModel):
    trace_id: str
    answer: str
    provenance: list[str] = Field(min_length=1)
