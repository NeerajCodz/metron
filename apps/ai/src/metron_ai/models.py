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
