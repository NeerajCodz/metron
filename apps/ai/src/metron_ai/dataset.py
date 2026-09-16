from __future__ import annotations

import hashlib
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Final

import numpy as np
from faker import Faker

FEATURE_SCHEMA_VERSION: Final = "features-v2"
SCENARIOS: Final[tuple[str, ...]] = (
    "stable",
    "trending",
    "high_volatility",
    "liquidity_stress",
    "flash_crash",
    "recovery",
    "stablecoin_depeg",
    "bridge_failure",
    "gas_spike",
    "compound_stress",
)

FEATURE_COLUMNS: Final[tuple[str, ...]] = (
    "collateral_usd",
    "debt_usd",
    "liquidation_threshold_bps",
    "health_factor_wad",
    "volatility_bps",
    "stablecoin_deviation_bps",
    "protocol_risk_bps",
    "net_delta_wad",
    "lp_value_usd",
    "lp_range_drift_bps",
    "hedge_notional_usd",
    "pool_depth_usd",
    "borrow_cost_bps",
    "yield_bps",
    "gas_multiplier_bps",
    "bridge_pending",
    "cross_chain_exposure_usd",
)
LABEL_COLUMNS: Final[tuple[str, ...]] = (
    "liquidation_within_1h",
    "liquidation_within_6h",
    "liquidation_within_24h",
    "liquidation_within_7d",
    "regime",
    "cascade_severity_bps",
    "recovery_success",
    "best_recovery_action",
)

# Features available from the authenticated risk API today. The remaining
# portfolio features stay in the dataset for component and recovery models.
RISK_MODEL_FEATURE_COLUMNS: Final[tuple[str, ...]] = (
    "collateral_usd",
    "debt_usd",
    "liquidation_threshold_bps",
    "health_factor_wad",
    "volatility_bps",
    "stablecoin_deviation_bps",
    "protocol_risk_bps",
    "net_delta_wad",
)


@dataclass(frozen=True)
class DatasetConfig:
    rows: int = 1_000
    seed: int = 7
    start_timestamp: int = 1_700_000_000
    interval_seconds: int = 300


@dataclass(frozen=True)
class SyntheticRecord:
    record_id: str
    scenario_id: str
    timestamp: int
    user_id: str
    wallet_address: str
    chain_id: int
    protocol: str
    pool_id: str
    features: dict[str, int | float]
    labels: dict[str, int | str]
    source_type: str = "synthetic"
    feature_schema_version: str = FEATURE_SCHEMA_VERSION

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _address(rng: np.random.Generator) -> str:
    raw = rng.integers(0, 256, size=20, dtype=np.uint8).tobytes()
    return f"0x{raw.hex()}"


def _scenario_parameters(scenario: str) -> tuple[float, float, float, float, float]:
    return {
        "stable": (0.35, 450.0, 15.0, 400.0, 1.0),
        "trending": (0.50, 1_200.0, 40.0, 700.0, 1.1),
        "high_volatility": (0.68, 4_500.0, 120.0, 1_400.0, 1.35),
        "liquidity_stress": (0.62, 2_800.0, 80.0, 1_600.0, 1.25),
        "flash_crash": (0.78, 7_000.0, 250.0, 2_000.0, 1.55),
        "recovery": (0.48, 1_800.0, 55.0, 900.0, 1.05),
        "stablecoin_depeg": (0.55, 2_200.0, 350.0, 1_000.0, 1.2),
        "bridge_failure": (0.52, 1_600.0, 35.0, 1_300.0, 1.15),
        "gas_spike": (0.45, 1_000.0, 25.0, 700.0, 1.3),
        "compound_stress": (0.74, 6_000.0, 200.0, 2_200.0, 1.5),
    }[scenario]


def _future_liquidation_probability(
    health_factor: float,
    volatility_bps: float,
    stablecoin_deviation_bps: float,
    protocol_risk_bps: float,
    future_price_shock: float,
) -> float:
    health_component = _clamp((1.25 - health_factor) / 0.8, 0.0, 1.0)
    volatility_component = _clamp(volatility_bps / 10_000.0, 0.0, 1.0)
    depeg_component = _clamp(abs(stablecoin_deviation_bps) / 10_000.0, 0.0, 1.0)
    protocol_component = _clamp(protocol_risk_bps / 10_000.0, 0.0, 1.0)
    shock_component = _clamp(max(0.0, -future_price_shock) / 0.5, 0.0, 1.0)
    return _clamp(
        health_component * 0.48
        + volatility_component * 0.18
        + depeg_component * 0.12
        + protocol_component * 0.08
        + shock_component * 0.14,
        0.0,
        1.0,
    )


def generate_dataset(config: DatasetConfig | None = None) -> list[SyntheticRecord]:
    config = config or DatasetConfig()
    if config.rows < 1:
        raise ValueError("rows must be positive")
    if config.interval_seconds < 1:
        raise ValueError("interval_seconds must be positive")

    fake = Faker("en_US")
    fake.seed_instance(config.seed)
    rng = np.random.default_rng(config.seed)
    records: list[SyntheticRecord] = []

    for index in range(config.rows):
        scenario = SCENARIOS[index % len(SCENARIOS)]
        debt_ratio, volatility_base, depeg_base, protocol_base, shock_scale = _scenario_parameters(
            scenario
        )
        collateral = float(rng.uniform(5_000.0, 100_000.0))
        debt = collateral * _clamp(debt_ratio + float(rng.normal(0.0, 0.06)), 0.05, 0.92)
        threshold = int(rng.integers(7_000, 8_500))
        health_factor = collateral * threshold / 10_000.0 / debt
        volatility = int(max(0.0, volatility_base + rng.normal(0.0, volatility_base * 0.12)))
        depeg_sign = -1 if rng.random() < 0.5 else 1
        depeg = int(
            depeg_sign * max(0.0, depeg_base + rng.normal(0.0, max(5.0, depeg_base * 0.15)))
        )
        protocol_risk = int(_clamp(protocol_base + rng.normal(0.0, 120.0), 0.0, 10_000.0))
        delta = int(rng.normal(0.0, 0.18 if scenario in {"stable", "recovery"} else 0.42) * 10**18)
        lp_value = collateral * float(rng.uniform(0.15, 0.65))
        lp_drift = int(max(0.0, abs(rng.normal(0.0, 450.0 if scenario != "stable" else 120.0))))
        hedge_notional = abs(delta) / 10**18 * collateral * float(rng.uniform(0.5, 1.1))
        pool_depth = max(2_000.0, lp_value * float(rng.uniform(0.8, 4.0)))
        borrow_cost = int(max(0.0, 250.0 + volatility * 0.12 + rng.normal(0.0, 35.0)))
        yield_bps = int(max(0.0, 650.0 + rng.normal(0.0, 120.0) - protocol_risk * 0.08))
        gas_multiplier = int(
            max(
                10_000.0,
                10_000.0 + (1_000.0 if scenario == "gas_spike" else 0.0) + rng.normal(0.0, 300.0),
            )
        )
        bridge_pending = int(
            scenario == "bridge_failure" or (scenario == "compound_stress" and rng.random() < 0.35)
        )
        cross_chain_exposure = collateral * float(rng.uniform(0.0, 0.75)) if bridge_pending else 0.0

        future_price_shock = float(rng.normal(-0.02 * shock_scale, 0.08 * shock_scale))
        future_health = health_factor * (1.0 + future_price_shock)
        probability = _future_liquidation_probability(
            future_health,
            float(volatility),
            float(depeg),
            float(protocol_risk),
            future_price_shock,
        )
        horizon_thresholds = (0.30, 0.24, 0.18, 0.12)
        liquidation_labels = {
            f"liquidation_within_{name}": int(probability >= threshold)
            for name, threshold in zip(
                ("1h", "6h", "24h", "7d"),
                horizon_thresholds,
                strict=True,
            )
        }
        if scenario in SCENARIOS:
            regime = (
                scenario
                if scenario
                in {
                    "stable",
                    "trending",
                    "high_volatility",
                    "liquidity_stress",
                    "flash_crash",
                    "recovery",
                }
                else ("liquidity_stress" if scenario == "bridge_failure" else "high_volatility")
            )
        else:
            regime = "stable"
        cascade_severity = int(
            _clamp(
                probability * 10_000.0
                + max(0.0, float(volatility) - 1_000.0) * 0.35
                + float(bridge_pending) * 700.0,
                0.0,
                100_000.0,
            )
        )
        action_scores = {
            "repay_debt": probability * 1.2 + max(0.0, 1.2 - health_factor),
            "adjust_hedge": abs(delta) / 10**18 + max(0.0, lp_drift - 400.0) / 10_000.0,
            "recenter_liquidity": max(0.0, lp_drift - 300.0) / 10_000.0,
            "move_to_safe_state": float(bridge_pending) * 0.8 + probability * 0.5,
        }
        best_action = max(action_scores, key=action_scores.__getitem__)
        recovery_success = int(
            rng.random()
            < _clamp(
                0.92 - probability * 0.45 - (0.12 if bridge_pending else 0.0),
                0.05,
                0.98,
            )
        )

        records.append(
            SyntheticRecord(
                record_id=fake.uuid4(),
                scenario_id=f"{scenario}-{index // len(SCENARIOS):05d}",
                timestamp=config.start_timestamp + index * config.interval_seconds,
                user_id=fake.uuid4(),
                wallet_address=_address(rng),
                chain_id=int(rng.choice((1, 10, 42161, 8453, 421614, 84532))),
                protocol=str(rng.choice(("aave-v3", "uniswap-v4", "layerzero-v2"))),
                pool_id=fake.uuid4(),
                features={
                    "collateral_usd": round(collateral, 6),
                    "debt_usd": round(debt, 6),
                    "liquidation_threshold_bps": threshold,
                    "health_factor_wad": int(health_factor * 10**18),
                    "volatility_bps": volatility,
                    "stablecoin_deviation_bps": depeg,
                    "protocol_risk_bps": protocol_risk,
                    "net_delta_wad": delta,
                    "lp_value_usd": round(lp_value, 6),
                    "lp_range_drift_bps": lp_drift,
                    "hedge_notional_usd": round(hedge_notional, 6),
                    "pool_depth_usd": round(pool_depth, 6),
                    "borrow_cost_bps": borrow_cost,
                    "yield_bps": yield_bps,
                    "gas_multiplier_bps": gas_multiplier,
                    "bridge_pending": bridge_pending,
                    "cross_chain_exposure_usd": round(cross_chain_exposure, 6),
                },
                labels={
                    **liquidation_labels,
                    "regime": regime,
                    "cascade_severity_bps": cascade_severity,
                    "recovery_success": recovery_success,
                    "best_recovery_action": best_action,
                },
            )
        )
    return records


def dataset_fingerprint(records: list[SyntheticRecord]) -> str:
    payload = "\n".join(
        json.dumps(record.as_dict(), sort_keys=True, separators=(",", ":")) for record in records
    ).encode()
    return hashlib.sha256(payload).hexdigest()


def validate_dataset(records: list[SyntheticRecord]) -> dict[str, object]:
    if not records:
        raise ValueError("dataset must not be empty")
    previous_timestamp: int | None = None
    scenarios: set[str] = set()
    binary_labels = (
        "liquidation_within_1h",
        "liquidation_within_6h",
        "liquidation_within_24h",
        "liquidation_within_7d",
        "recovery_success",
    )
    label_counts: dict[str, int] = {column: 0 for column in binary_labels}
    nonnegative_features = (
        "collateral_usd",
        "debt_usd",
        "health_factor_wad",
        "protocol_risk_bps",
        "lp_value_usd",
        "lp_range_drift_bps",
        "hedge_notional_usd",
        "pool_depth_usd",
        "borrow_cost_bps",
        "yield_bps",
        "gas_multiplier_bps",
        "cross_chain_exposure_usd",
    )
    feature_ranges: dict[str, dict[str, float]] = {
        column: {"min": math.inf, "max": -math.inf} for column in FEATURE_COLUMNS
    }
    missingness: dict[str, int] = {column: 0 for column in FEATURE_COLUMNS}
    scenario_coverage: dict[str, int] = {}
    group_ids: set[str] = set()
    for record in records:
        if (
            record.source_type != "synthetic"
            or record.feature_schema_version != FEATURE_SCHEMA_VERSION
        ):
            raise ValueError("record provenance or feature schema is invalid")
        if previous_timestamp is not None and record.timestamp <= previous_timestamp:
            raise ValueError("timestamps must be strictly increasing")
        scenario_name = record.scenario_id.split("-", maxsplit=1)[0]
        scenario_coverage[scenario_name] = scenario_coverage.get(scenario_name, 0) + 1
        if record.user_id in group_ids:
            raise ValueError("group leakage detected: user appears in multiple records")
        group_ids.add(record.user_id)
        for column in FEATURE_COLUMNS:
            raw_value = record.features.get(column)
            if raw_value is None:
                missingness[column] += 1
                continue
            numeric_value = float(raw_value)
            if not math.isfinite(numeric_value):
                raise ValueError(f"feature {column} is non-finite")
            feature_ranges[column]["min"] = min(feature_ranges[column]["min"], numeric_value)
            feature_ranges[column]["max"] = max(feature_ranges[column]["max"], numeric_value)
        previous_timestamp = record.timestamp
        if set(record.features) != set(FEATURE_COLUMNS):
            raise ValueError("feature columns do not match the feature schema")
        if set(record.labels) != set(LABEL_COLUMNS):
            raise ValueError("label columns do not match the label schema")
        if any(record.features[column] < 0 for column in nonnegative_features):
            raise ValueError("nonnegative feature contains a negative value")
        if not 0 <= record.features["liquidation_threshold_bps"] <= 10_000:
            raise ValueError("liquidation threshold must be in basis points")
        if not 0 <= record.features["bridge_pending"] <= 1:
            raise ValueError("bridge_pending must be binary")
        previous_label = 0
        for label in binary_labels:
            value = int(record.labels[label])
            if value not in (0, 1):
                raise ValueError(f"{label} must be binary")
            if label.startswith("liquidation") and value < previous_label:
                raise ValueError("liquidation labels must be monotonic by horizon")
            if label.startswith("liquidation"):
                previous_label = value
            label_counts[label] += value
        scenarios.add(record.scenario_id.split("-", maxsplit=1)[0])
    train_end = int(len(records) * 0.7)
    validation_end = int(len(records) * 0.85)
    split_records = {
        "train": records[:train_end],
        "validation": records[train_end:validation_end],
        "test": records[validation_end:],
    }
    scenario_coverage_by_split = {
        split: {
            scenario: sum(1 for record in split_rows if record.scenario_id.split("-", maxsplit=1)[0] == scenario)
            for scenario in sorted(scenarios)
        }
        for split, split_rows in split_records.items()
    }
    label_prevalence = {
        label: label_counts[label] / len(records)
        for label in binary_labels
    }
    return {
        "rows": len(records),
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "fingerprint": dataset_fingerprint(records),
        "scenario_count": len(scenarios),
        "scenarios": sorted(scenarios),
        "scenario_coverage": scenario_coverage,
        "scenario_coverage_by_split": scenario_coverage_by_split,
        "label_positive_counts": label_counts,
        "label_prevalence": label_prevalence,
        "class_balance": label_prevalence,
        "feature_ranges": feature_ranges,
        "missingness": missingness,
        "temporal_split_boundaries": {
            "train_end": records[train_end - 1].timestamp if train_end else None,
            "validation_end": records[validation_end - 1].timestamp if validation_end else None,
            "test_end": records[-1].timestamp,
        },
        "group_leakage_checked": True,
        "accounting_invariants_checked": True,
        "chronology_invariants_checked": True,
    }


def write_jsonl(records: list[SyntheticRecord], path: Path) -> dict[str, object]:
    report = validate_dataset(records)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(json.dumps(record.as_dict(), sort_keys=True, separators=(",", ":")))
            handle.write("\n")
    return report


def read_jsonl(path: Path) -> list[SyntheticRecord]:
    records: list[SyntheticRecord] = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            payload = json.loads(line)
            records.append(
                SyntheticRecord(
                    record_id=str(payload["record_id"]),
                    scenario_id=str(payload["scenario_id"]),
                    timestamp=int(payload["timestamp"]),
                    user_id=str(payload["user_id"]),
                    wallet_address=str(payload["wallet_address"]),
                    chain_id=int(payload["chain_id"]),
                    protocol=str(payload["protocol"]),
                    pool_id=str(payload["pool_id"]),
                    features={str(key): value for key, value in payload["features"].items()},
                    labels={str(key): value for key, value in payload["labels"].items()},
                    source_type=str(payload.get("source_type", "")),
                    feature_schema_version=str(payload.get("feature_schema_version", "")),
                )
            )
    validate_dataset(records)
    return records
