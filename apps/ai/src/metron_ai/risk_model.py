from __future__ import annotations

import json
from decimal import Decimal
from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from typing import cast
from uuid import NAMESPACE_URL, uuid5

from metron_ai.dataset import RISK_MODEL_FEATURE_COLUMNS
from metron_ai.ml import ModelArtifact, in_distribution, load_artifact, predict_artifact
from metron_ai.models import (
    LiquidationPrediction,
    LiquidationRequest,
    MarketRegime,
    RegimePrediction,
    RegimeRequest,
)
from metron_ai.settings import get_settings

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


@lru_cache(maxsize=8)
def _load_models(directory: str) -> dict[str, ModelArtifact]:
    root = Path(directory)
    artifacts: dict[str, ModelArtifact] = {}
    for task in (
        "liquidation_within_1h",
        "liquidation_within_6h",
        "liquidation_within_24h",
        "liquidation_within_7d",
        "regime",
    ):
        path = root / f"{task}.json"
        if path.exists():
            try:
                artifacts[task] = load_artifact(path)
            except (OSError, TypeError, ValueError, KeyError):
                continue
    return artifacts


def _model_features(request: LiquidationRequest | RegimeRequest) -> dict[str, int | float]:
    features = request.features
    health_factor_wad = features.health_factor_wad
    if health_factor_wad is None:
        health_factor_wad = int(_health_factor(request) * _WAD)
    return {
        RISK_MODEL_FEATURE_COLUMNS[0]: float(features.collateral_usd),
        RISK_MODEL_FEATURE_COLUMNS[1]: float(features.debt_usd),
        RISK_MODEL_FEATURE_COLUMNS[2]: features.liquidation_threshold_bps,
        RISK_MODEL_FEATURE_COLUMNS[3]: health_factor_wad,
        RISK_MODEL_FEATURE_COLUMNS[4]: features.volatility_bps,
        RISK_MODEL_FEATURE_COLUMNS[5]: features.stablecoin_deviation_bps,
        RISK_MODEL_FEATURE_COLUMNS[6]: features.protocol_risk_bps,
        RISK_MODEL_FEATURE_COLUMNS[7]: features.net_delta_wad,
    }


def _stable_id(prefix: str, trace_id: str, position_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"metron:{prefix}:{trace_id}:{position_id}"))


def _fallback_liquidation(
    request: LiquidationRequest,
) -> dict[str, int]:
    base = _base_probability(request)
    horizon_factor = {"1h": Decimal("0.65"), "6h": Decimal("0.92"), "24h": Decimal("1.25"), "7d": Decimal("1.65")}
    return {
        horizon: int(
            (
                _clamp(base * horizon_factor[horizon], Decimal("0"), Decimal("1")) * _BPS
            ).to_integral_value()
        )
        for horizon in request.horizons
    }


def predict_liquidation(request: LiquidationRequest, generated_at: int) -> LiquidationPrediction:
    features = _model_features(request)
    models: dict[str, ModelArtifact] = {}
    try:
        models = _load_models(str(get_settings().model_artifact_directory))
    except (OSError, TypeError, ValueError):
        models = {}

    task_for_horizon = {
        "1h": "liquidation_within_1h",
        "6h": "liquidation_within_6h",
        "24h": "liquidation_within_24h",
        "7d": "liquidation_within_7d",
    }
    fallback = _fallback_liquidation(request)
    horizons: dict[str, int] = {}
    fingerprints: set[str] = set()
    source_by_horizon: dict[str, str] = {}
    for horizon in request.horizons:
        artifact = models.get(task_for_horizon[horizon])
        if artifact is not None and in_distribution(artifact, features):
            try:
                probability = predict_artifact(artifact, features).get("1", 0.0)
                horizons[horizon] = max(0, min(10_000, round(probability * 10_000)))
                fingerprints.add(artifact.dataset_fingerprint)
                source_by_horizon[horizon] = "model"
                continue
            except (KeyError, TypeError, ValueError, OverflowError):
                pass
        horizons[horizon] = fallback[horizon]
        source_by_horizon[horizon] = "deterministic"

    confidence = 10_000 - min(
        8_000,
        request.features.volatility_bps // 2 + abs(request.features.stablecoin_deviation_bps) * 2,
    )
    used_ml = "model" in source_by_horizon.values()
    mixed = used_ml and "deterministic" in source_by_horizon.values()
    model_version = "risk-ml-v1+deterministic" if mixed else ("risk-ml-v1" if used_ml else "risk-deterministic-v1")
    return LiquidationPrediction(
        trace_id=request.trace_id,
        position_id=request.position_id,
        prediction_id=_stable_id("liquidation", request.trace_id, request.position_id),
        generated_at=generated_at,
        horizons=horizons,
        model_version=model_version,
        dataset_fingerprint=next(iter(fingerprints), None),
        feature_fingerprint=feature_fingerprint(request),
        source_by_horizon=source_by_horizon,
        prediction_source="mixed" if mixed else ("model" if used_ml else "deterministic"),
        fallback_reason="artifact_missing_or_out_of_distribution" if not used_ml else ("partial_artifact_coverage" if mixed else None),
        confidence_bps=max(1_000, confidence),
        fallback_used=not used_ml or mixed,
    )


def _fallback_regime(request: RegimeRequest) -> dict[str, int]:
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
        name: int((value / total * _BPS).to_integral_value()) for name, value in scores.items()
    }
    difference = 10_000 - sum(probabilities.values())
    selected = max(probabilities, key=probabilities.__getitem__)
    probabilities[selected] += difference
    return probabilities


def predict_regime(request: RegimeRequest, generated_at: int) -> RegimePrediction:
    features = _model_features(request)
    artifact: ModelArtifact | None = None
    try:
        candidate = _load_models(str(get_settings().model_artifact_directory)).get("regime")
        if candidate is not None and in_distribution(candidate, features):
            artifact = candidate
    except (OSError, TypeError, ValueError):
        artifact = None

    if artifact is None:
        probabilities = _fallback_regime(request)
        selected = max(probabilities, key=probabilities.__getitem__)
        model_version = "risk-deterministic-v1"
        fallback_used = True
    else:
        try:
            raw = predict_artifact(artifact, features)
            probabilities = {
                regime: max(0, round(raw.get(regime, 0.0) * 10_000)) for regime in _REGIMES
            }
            difference = 10_000 - sum(probabilities.values())
            selected = max(probabilities, key=probabilities.__getitem__)
            probabilities[selected] += difference
            model_version = artifact.model_version
            fallback_used = False
        except (KeyError, TypeError, ValueError, OverflowError):
            probabilities = _fallback_regime(request)
            selected = max(probabilities, key=probabilities.__getitem__)
            model_version = "risk-deterministic-v1"
            fallback_used = True
    return RegimePrediction(
        trace_id=request.trace_id,
        position_id=request.position_id,
        generated_at=generated_at,
        probabilities_bps=probabilities,
        selected_regime=cast(MarketRegime, selected),
        model_version=model_version,
        dataset_fingerprint=artifact.dataset_fingerprint if artifact is not None else None,
        feature_fingerprint=feature_fingerprint(request),
        prediction_source="model" if not fallback_used else "deterministic",
        fallback_reason=None if not fallback_used else "artifact_missing_or_out_of_distribution",
        fallback_used=fallback_used,
    )


def feature_fingerprint(request: LiquidationRequest | RegimeRequest) -> str:
    payload = json.dumps(
        request.model_dump(mode="json"), sort_keys=True, separators=(",", ":")
    ).encode()
    return sha256(payload).hexdigest()

def model_status() -> dict[str, object]:
    directory = Path(str(get_settings().model_artifact_directory))
    tasks = (
        "liquidation_within_1h",
        "liquidation_within_6h",
        "liquidation_within_24h",
        "liquidation_within_7d",
        "regime",
    )
    missing = [task for task in tasks if not (directory / f"{task}.json").exists()]
    invalid: list[str] = []
    for task in tasks:
        path = directory / f"{task}.json"
        if not path.exists():
            continue
        try:
            load_artifact(path)
        except (OSError, TypeError, ValueError, KeyError):
            invalid.append(task)
    if invalid:
        status = "artifact_invalid"
    elif missing:
        status = "artifact_missing" if not directory.exists() else "deterministic_only"
    else:
        status = "models_loaded"
    return {"status": status, "directory": str(directory), "missing": missing, "invalid": invalid, "horizons": list(tasks[:4])}
