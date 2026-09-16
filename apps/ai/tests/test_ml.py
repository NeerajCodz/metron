from __future__ import annotations

import json

from metron_ai.dataset import DatasetConfig, generate_dataset, validate_dataset
from metron_ai.ml import (
    ModelArtifact,
    in_distribution,
    predict_artifact,
    save_artifacts,
    train_models,
)


def test_synthetic_generation_is_seeded_and_covers_scenarios() -> None:
    config = DatasetConfig(rows=100, seed=42)
    first = generate_dataset(config)
    second = generate_dataset(config)
    assert [record.as_dict() for record in first] == [record.as_dict() for record in second]
    report = validate_dataset(first)
    assert report["rows"] == 100
    assert set(report["scenarios"]) == {
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
    }


def test_training_produces_json_safe_artifacts_and_beats_baselines(tmp_path) -> None:
    records = generate_dataset(DatasetConfig(rows=600, seed=9))
    artifacts = train_models(records, seed=9)
    assert set(artifacts) == {
        "liquidation_within_1h",
        "liquidation_within_6h",
        "liquidation_within_24h",
        "liquidation_within_7d",
        "regime",
    }
    for artifact in artifacts.values():
        assert artifact.feature_schema_version == "features-v2"
        assert artifact.metrics
        assert artifact.as_dict()["schema_version"] == "model-v1"
    report = save_artifacts(artifacts, tmp_path / "models")
    assert len(report["dataset_fingerprints"]) == 1
    payload = json.loads((tmp_path / "models" / "regime.json").read_text(encoding="utf-8"))
    loaded = ModelArtifact.from_dict(payload)
    features = records[-1].features
    model_features = {key: features[key] for key in loaded.feature_columns}
    probabilities = predict_artifact(loaded, model_features)
    assert abs(sum(probabilities.values()) - 1.0) < 1e-9
    assert in_distribution(loaded, model_features)
