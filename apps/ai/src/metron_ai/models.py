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
Horizon = Literal["1h", "6h", "24h", "7d"]
SUPPORTED_HORIZONS: tuple[Horizon, ...] = ("1h", "6h", "24h", "7d")


class SourceSpan(BaseModel):
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    fragment: str = Field(min_length=1)

    @field_validator("end")
    @classmethod
    def end_after_start(cls, value: int, info: object) -> int:
        start = getattr(info, "data", {}).get("start", 0)
        if value < start:
            raise ValueError("source span end must not precede start")
        return value


class ExtractionEvidence(BaseModel):
    field: str = Field(min_length=1)
    value: str = Field(min_length=1)
    confidence_bps: int = Field(ge=0, le=10_000)
    status: Literal["confirmed", "ambiguous", "missing"] = "confirmed"
    source_spans: list[SourceSpan] = Field(default_factory=list)


class Ambiguity(BaseModel):
    field: str = Field(min_length=1)
    reason_code: Literal["missing", "conflicting", "unlabeled", "unsupported", "incomplete"]
    alternatives: list[str] = Field(default_factory=list)
    requires_confirmation: bool = True


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
    horizons: list[Horizon] = Field(min_length=1, max_length=4)

    @field_validator("horizons")
    @classmethod
    def validate_horizons(cls, values: list[Horizon]) -> list[Horizon]:
        if len(set(values)) != len(values):
            raise ValueError("horizons must contain unique supported values")
        return values
class LiquidationPrediction(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    position_id: str
    prediction_id: str
    model_version: str = MODEL_VERSION
    feature_schema_version: str = FEATURE_SCHEMA_VERSION
    dataset_fingerprint: str | None = None
    feature_fingerprint: str | None = None
    artifact_version: str | None = None
    fallback_reason: str | None = None
    prediction_source: Literal["model", "deterministic", "mixed"] = "deterministic"
    source_by_horizon: dict[Horizon, Literal["model", "deterministic"]] = Field(default_factory=dict)
    generated_at: int
    horizons: dict[Horizon, int]
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
    dataset_fingerprint: str | None = None
    feature_fingerprint: str | None = None
    generated_at: int
    probabilities_bps: dict[str, int]
    selected_regime: MarketRegime
    prediction_source: Literal["model", "deterministic"] = "deterministic"
    fallback_reason: str | None = None
    fallback_used: bool

class StressScenario(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    scenario_id: str = "scenario"
    eth_price_shock_bps: int = Field(ge=-10_000, le=100_000)
    stablecoin_depeg_bps: int = Field(ge=-10_000, le=10_000)
    dex_liquidity_shock_bps: int = Field(ge=-10_000, le=100_000)
    volatility_multiplier_bps: int = Field(ge=0, le=1_000_000)
    gas_multiplier_bps: int = Field(ge=0, le=1_000_000)
    lending_utilization_shock_bps: int = Field(ge=-10_000, le=10_000)

class ObservationReference(BaseModel):
    observation_id: str = Field(min_length=1)
    source: str = Field(min_length=1)
    observed_at_ms: int = Field(ge=0)
    quality: Literal["valid", "stale", "invalid"]


class SimulationComponent(BaseModel):
    component_id: str = Field(min_length=1)
    component_type: Literal["lending", "liquidity", "hedge", "bridge", "protocol"]
    chain_id: int = Field(gt=0)
    asset: str = Field(min_length=1)
    pool_id: str | None = None
    value_usd: Decimal = Field(ge=0)
    delta_wad: int
    health_factor_wad: int | None = Field(default=None, ge=0)
    observations: list[ObservationReference] = Field(default_factory=list)


class ComponentEffect(BaseModel):
    component_id: str
    before_value_usd: Decimal
    after_value_usd: Decimal
    delta_usd: Decimal
    before_delta_wad: int
    after_delta_wad: int
    failure_reason: str | None = None

class SimulationRequest(BaseModel):
    position_id: str = Field(min_length=1)
    trace_id: str = Field(min_length=1)
    features: RiskFeatures
    scenarios: list[StressScenario] = Field(min_length=1, max_length=32)
    components: list[SimulationComponent] = Field(default_factory=list, max_length=128)


class ScenarioResult(BaseModel):
    scenario_index: int
    scenario_id: str = "scenario"
    health_factor_wad: int
    net_delta_wad: int
    liquidation_probability_bps: int = Field(ge=0, le=10_000)
    estimated_loss_bps: int = Field(ge=0, le=100_000)
    cost_usd: Decimal = Decimal("0")
    component_effects: list[ComponentEffect] = Field(default_factory=list)
    failure_reason: str | None = None
    assumptions: list[str] = Field(min_length=1)


class SimulationResponse(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    position_id: str
    model_version: str = MODEL_VERSION
    feature_schema_version: str = FEATURE_SCHEMA_VERSION
    generated_at: int
    scenarios: list[ScenarioResult]
    provenance: list[ObservationReference] = Field(default_factory=list)
    fallback_reason: str | None = None
    fallback_used: bool = False


class ExplanationEvidence(BaseModel):
    evidence_id: str = Field(min_length=1)
    kind: Literal["observation", "calculation", "prediction", "scenario"]
    source_reference: str = Field(min_length=1)
    trace_id: str
    observed_at_ms: int | None = Field(default=None, ge=0)
    quality: Literal["valid", "stale", "invalid"] = "valid"
    content: dict[str, str | int | float | bool | None]


class ExplanationRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    answer_kind: Literal["value", "trend", "driver", "comparison", "scenario_impact"] = "driver"
    observed_data: list[str] = Field(default_factory=list)
    deterministic_calculations: list[str] = Field(default_factory=list)
    model_predictions: list[str] = Field(default_factory=list)
    scenario_assumptions: list[str] = Field(default_factory=list)
    evidence: list[ExplanationEvidence] = Field(default_factory=list)


class ExplanationResponse(BaseModel):
    trace_id: str
    answer_kind: Literal["value", "trend", "driver", "comparison", "scenario_impact"] = "driver"
    answer: str = ""
    observed_data: list[str] = Field(default_factory=list)
    deterministic_calculations: list[str] = Field(default_factory=list)
    model_predictions: list[str] = Field(default_factory=list)
    scenario_assumptions: list[str] = Field(default_factory=list)
    evidence: list[ExplanationEvidence] = Field(default_factory=list)
    missing_evidence_ids: list[str] = Field(default_factory=list)
    refusal_code: Literal[
        "unsupported_answer_kind", "missing_evidence", "stale_evidence", "conflicting_evidence", "untrusted_source"
    ] | None = None


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
    market_id: str = Field(default="market", min_length=1)
    venue_id: str = Field(default="venue", min_length=1)
    forced_selling_usd: Decimal = Field(ge=0)
    market_depth_usd: Decimal = Field(gt=0)
    price_impact_slope_bps: int = Field(ge=0, le=100_000)
    propagation_factor_bps: int = Field(default=10_000, ge=0, le=10_000)
    max_rounds: int = Field(default=8, ge=1, le=32)
    positions: list[CascadePosition] = Field(min_length=1, max_length=1000)


class CascadeRound(BaseModel):
    round_index: int
    consumed_depth_usd: Decimal
    remaining_depth_usd: Decimal
    incremental_impact_bps: int
    cumulative_impact_bps: int
    generated_selling_usd: Decimal
    unresolved_selling_usd: Decimal
    liquidated_position_ids: list[str] = Field(default_factory=list)


class CascadeResponse(BaseModel):
    schema_version: Literal["1.0.0"] = RISK_SCHEMA_VERSION
    trace_id: str
    generated_at: int
    market_id: str = "market"
    venue_id: str = "venue"
    forced_selling_volume_usd: Decimal
    consumed_depth_usd: Decimal
    remaining_depth_usd: Decimal = Decimal("0")
    secondary_price_impact_bps: int
    newly_liquidatable_positions: list[str]
    affected_position_count: int
    secondary_exposure_usd: Decimal
    rounds: int
    round_records: list[CascadeRound] = Field(default_factory=list)
    unresolved_selling_usd: Decimal = Decimal("0")
    termination_reason: Literal["fixed_point", "depth_exhausted", "max_rounds", "no_selling"] = "fixed_point"
    converged: bool


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
    intent_type: Literal["yield", "stable_yield", "lending", "liquidity", "protection"]
    objective: dict[str, int]
    risk: dict[str, int]
    exposure: dict[str, int]
    automation: dict[str, bool]
    assets: list[str]
    chains: list[int]
    protocols: list[str]
    ambiguities: list[Ambiguity] = Field(default_factory=list)
    evidence: list[ExtractionEvidence] = Field(default_factory=list)
    source_text: str
    requires_approval: bool = True

class ThresholdRequest(BaseModel):
    trace_id: str = Field(min_length=1)
    current_liquidation_probability_bps: int = Field(ge=0, le=10_000)
    user_max_probability_bps: int = Field(ge=0, le=10_000)
    administrator_max_probability_bps: int = Field(ge=0, le=10_000)
    hysteresis_bps: int = Field(ge=0, le=10_000)
    market_regime: MarketRegime | None = None
    liquidity_stress_bps: int = Field(default=0, ge=0, le=10_000)
    protocol_risk_bps: int = Field(default=0, ge=0, le=10_000)
    health_factor_wad: int | None = Field(default=None, ge=0)
    observation_quality: Literal["valid", "stale", "invalid", "missing"] = "valid"
    observation_ids: list[str] = Field(default_factory=list)
    policy_id: str = "threshold-policy-v1"
    policy_version: str = "1"
    evaluation_time_ms: int | None = Field(default=None, ge=0)
    prior_intervention_bps: int = Field(default=0, ge=0, le=10_000)


class ThresholdResponse(BaseModel):
    trace_id: str
    recommended_intervention_bps: int = Field(ge=0, le=10_000)
    intervention_required: bool
    rationale: list[str] = Field(min_length=1)
    policy_id: str = "threshold-policy-v1"
    policy_version: str = "1"
    evaluation_time_ms: int = 0
    adjustment_terms: dict[str, int] = Field(default_factory=dict)
    selected_cap_bps: int = Field(ge=0, le=10_000)
    validity_window_ms: int = Field(default=300_000, ge=0)
    fallback_reason: str | None = None

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
    ambiguities: list[Ambiguity] = Field(default_factory=list)
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
    refusal_reason: str | None = None
