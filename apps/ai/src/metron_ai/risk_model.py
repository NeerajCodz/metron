from __future__ import annotations

import json
from decimal import Decimal
from hashlib import sha256
from typing import cast
from uuid import NAMESPACE_URL, uuid5

from metron_ai.models import (
    LiquidationPrediction,
    LiquidationRequest,
    MarketRegime,
    RegimePrediction,
    RegimeRequest,
)

_BPS = Decimal(10_000)
_WAD = Decimal(10**18)
_REGIMES = ("stable", "trending", "high_volatility", "liquidity_stress", "flash_crash", "recovery")


def _clamp(value: Decimal, lower: Decimal, upper: Decimal) -> Decimal:
    return max(lower, min(upper, value))


def _health_factor(request: LiquidationRequest | RegimeRequest) -> Decimal:
    features = request.features
    if features.health_factor_wad is not None:
        return Decimal(features.health_factor_wad) / _WAD
    if features.debt_usd == 0:
        return Decimal("100")
    return (
        features.collateral_usd
        * Decimal(features.liquidation_threshold_bps)
        / _BPS
        / features.debt_usd
    )


def _base_probability(request: LiquidationRequest | RegimeRequest) -> Decimal:
    features = request.features
    health_gap = _clamp(Decimal("1.2") - _health_factor(request), Decimal("0"), Decimal("1.2"))
    volatility = Decimal(features.volatility_bps) / _BPS
    depeg = abs(Decimal(features.stablecoin_deviation_bps)) / _BPS
    protocol = Decimal(features.protocol_risk_bps) / _BPS
    score = (
        health_gap / Decimal("1.2") * Decimal("0.65")
        + volatility * Decimal("0.2")
        + depeg * Decimal("0.1")
        + protocol * Decimal("0.05")
    )
    return _clamp(score, Decimal("0"), Decimal("1"))


def _stable_id(prefix: str, trace_id: str, position_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"metron:{prefix}:{trace_id}:{position_id}"))


def predict_liquidation(request: LiquidationRequest, generated_at: int) -> LiquidationPrediction:
    base = _base_probability(request)
    horizons: dict[str, int] = {}
    for horizon in request.horizons_days:
        horizon_factor = Decimal(horizon).sqrt() / Decimal("3")
        probability = _clamp(base * (Decimal("0.65") + horizon_factor), Decimal("0"), Decimal("1"))
        horizons[str(horizon)] = int((probability * _BPS).to_integral_value())
    confidence = 10_000 - min(
        8_000,
        request.features.volatility_bps // 2
        + abs(request.features.stablecoin_deviation_bps) * 2,
    )
    return LiquidationPrediction(
        trace_id=request.trace_id,
        position_id=request.position_id,
        prediction_id=_stable_id("liquidation", request.trace_id, request.position_id),
        generated_at=generated_at,
        horizons=horizons,
        confidence_bps=max(1_000, confidence),
        fallback_used=False,
    )


def predict_regime(request: RegimeRequest, generated_at: int) -> RegimePrediction:
    features = request.features
    base = _base_probability(request)
    volatility = Decimal(features.volatility_bps) / _BPS
    liquidity_stress = Decimal(
        abs(features.stablecoin_deviation_bps) + features.protocol_risk_bps
    ) / (Decimal(2) * _BPS)
    scores = {
        "stable": max(Decimal("0.01"), Decimal("1") - base - volatility),
        "trending": max(
            Decimal("0.01"),
            Decimal("0.25") + abs(Decimal(features.net_delta_wad)) / _WAD / 10,
        ),
        "high_volatility": max(Decimal("0.01"), volatility),
        "liquidity_stress": max(Decimal("0.01"), liquidity_stress),
        "flash_crash": max(Decimal("0.01"), base * Decimal("0.8")),
        "recovery": max(
            Decimal("0.01"),
            Decimal("0.1") if _health_factor(request) > Decimal("1.3") else Decimal("0.01"),
        ),
    }
    total = sum(scores.values(), Decimal("0"))
    probabilities = {
        name: int((value / total * _BPS).to_integral_value())
        for name, value in scores.items()
    }
    # Largest-remainder correction keeps the response an exact 10,000 bps distribution.
    difference = 10_000 - sum(probabilities.values())
    selected = max(probabilities, key=probabilities.__getitem__)
    probabilities[selected] += difference
    return RegimePrediction(
        trace_id=request.trace_id,
        position_id=request.position_id,
        generated_at=generated_at,
        probabilities_bps=probabilities,
        selected_regime=cast(MarketRegime, selected),
        fallback_used=False,
    )


def feature_fingerprint(request: LiquidationRequest | RegimeRequest) -> str:
    payload = json.dumps(
        request.model_dump(mode="json"), sort_keys=True, separators=(",", ":")
    ).encode()
    return sha256(payload).hexdigest()
