from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Final, cast

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, log_loss
from sklearn.preprocessing import StandardScaler

from metron_ai.dataset import (
    FEATURE_SCHEMA_VERSION,
    RISK_MODEL_FEATURE_COLUMNS,
    SyntheticRecord,
    dataset_fingerprint,
    validate_dataset,
)

MODEL_SCHEMA_VERSION: Final = "model-v1"


@dataclass(frozen=True)
class ModelArtifact:
    task: str
    model_version: str
    feature_schema_version: str
    feature_columns: tuple[str, ...]
    means: tuple[float, ...]
    scales: tuple[float, ...]
    classes: tuple[str, ...]
    coefficients: tuple[tuple[float, ...], ...]
    intercepts: tuple[float, ...]
    metrics: dict[str, float]
    dataset_fingerprint: str
    seed: int
    calibration_offset: float = 0.0

    def as_dict(self) -> dict[str, object]:
        return {
            "schema_version": MODEL_SCHEMA_VERSION,
            "task": self.task,
            "model_version": self.model_version,
            "feature_schema_version": self.feature_schema_version,
            "feature_columns": list(self.feature_columns),
            "means": list(self.means),
            "scales": list(self.scales),
            "classes": list(self.classes),
            "coefficients": [list(row) for row in self.coefficients],
            "intercepts": list(self.intercepts),
            "calibration_offset": self.calibration_offset,
            "metrics": self.metrics,
            "dataset_fingerprint": self.dataset_fingerprint,
            "seed": self.seed,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> ModelArtifact:
        if payload.get("schema_version") != MODEL_SCHEMA_VERSION:
            raise ValueError("unsupported model artifact schema")
        feature_columns = cast(list[object], payload["feature_columns"])
        means = cast(list[object], payload["means"])
        scales = cast(list[object], payload["scales"])
        classes = cast(list[object], payload["classes"])
        coefficients = cast(list[object], payload["coefficients"])
        intercepts = cast(list[object], payload["intercepts"])
        metrics = cast(dict[str, object], payload["metrics"])
        return cls(
            task=str(payload["task"]),
            model_version=str(payload["model_version"]),
            feature_schema_version=str(payload["feature_schema_version"]),
            feature_columns=tuple(str(item) for item in feature_columns),
            means=tuple(float(cast(str | int | float, item)) for item in means),
            scales=tuple(float(cast(str | int | float, item)) for item in scales),
            classes=tuple(str(item) for item in classes),
            coefficients=tuple(
                tuple(float(cast(str | int | float, item)) for item in cast(list[object], row))
                for row in coefficients
            ),
            intercepts=tuple(
                float(cast(str | int | float, item)) for item in intercepts
            ),
            metrics={
                str(key): float(cast(str | int | float, value))
                for key, value in metrics.items()
            },
            dataset_fingerprint=str(payload["dataset_fingerprint"]),
            seed=int(cast(str | int | float, payload["seed"])),
            calibration_offset=float(
                cast(str | int | float, payload.get("calibration_offset", 0.0))
            ),
        )


def _matrix(records: list[SyntheticRecord]) -> np.ndarray:
    return np.asarray(
        [
            [float(record.features[column]) for column in RISK_MODEL_FEATURE_COLUMNS]
            for record in records
        ],
        dtype=np.float64,
    )


def _labels(records: list[SyntheticRecord], label: str) -> np.ndarray:
    return np.asarray([record.labels[label] for record in records], dtype=np.float64)


def _fit_artifact(
    records: list[SyntheticRecord],
    task: str,
    labels: np.ndarray,
    seed: int,
    train_end: int,
    validation_end: int,
    test_end: int,
) -> ModelArtifact:
    matrix = _matrix(records)
    scaler = StandardScaler().fit(matrix[:train_end])
    scaled_train = scaler.transform(matrix[:train_end])
    scaled_validation = scaler.transform(matrix[train_end:validation_end])
    scaled_test = scaler.transform(matrix[validation_end:test_end])
    classifier = LogisticRegression(
        max_iter=1_000,
        random_state=seed,
        solver="lbfgs",
    )
    classifier.fit(scaled_train, labels[:train_end].astype(int))
    classes = tuple(str(item) for item in classifier.classes_)
    calibration_offset = 0.0
    if task.startswith("liquidation") and len(classes) == 2:
        validation_scores = classifier.decision_function(scaled_validation)
        validation_labels = labels[train_end:validation_end].astype(int)
        calibration_offset = min(
            np.linspace(-4.0, 4.0, 321),
            key=lambda offset: brier_score_loss(
                validation_labels,
                1.0 / (1.0 + np.exp(-(validation_scores + offset))),
            ),
        )
    probabilities = classifier.predict_proba(scaled_test)
    predictions = classifier.predict(scaled_test)
    if task.startswith("liquidation") and len(classes) == 2:
        positive_index = classes.index("1")
        scores = classifier.decision_function(scaled_test) + calibration_offset
        positive = 1.0 / (1.0 + np.exp(-scores))
        probabilities[:, positive_index] = positive
        probabilities[:, 1 - positive_index] = 1.0 - positive
    test_labels = labels[validation_end:test_end].astype(int)
    metrics: dict[str, float]
    if task.startswith("liquidation"):
        positive_index = classes.index("1")
        baseline_probability = float(labels[:train_end].mean())
        metrics = {
            "brier_score": float(brier_score_loss(test_labels, probabilities[:, positive_index])),
            "baseline_brier_score": float(
                brier_score_loss(test_labels, np.full(test_labels.shape, baseline_probability))
            ),
            "log_loss": float(
                log_loss(test_labels, probabilities, labels=[int(item) for item in classes])
            ),
            "accuracy": float(accuracy_score(test_labels, predictions)),
        }
        if metrics["brier_score"] > metrics["baseline_brier_score"]:
            raise ValueError(f"{task} model does not beat the constant baseline")
    else:
        majority = int(np.bincount(labels[:train_end].astype(int)).argmax())
        metrics = {
            "accuracy": float(accuracy_score(test_labels, predictions)),
            "macro_f1": float(f1_score(test_labels, predictions, average="macro")),
            "log_loss": float(
                log_loss(test_labels, probabilities, labels=[int(item) for item in classes])
            ),
            "baseline_accuracy": float(
                accuracy_score(test_labels, np.full(test_labels.shape, majority))
            ),
        }
        if metrics["accuracy"] < metrics["baseline_accuracy"]:
            raise ValueError(f"{task} model does not beat the majority baseline")

    return ModelArtifact(
        task=task,
        model_version=f"{task}-logistic-v1",
        feature_schema_version=FEATURE_SCHEMA_VERSION,
        feature_columns=RISK_MODEL_FEATURE_COLUMNS,
        means=tuple(float(value) for value in scaler.mean_),
        scales=tuple(float(value) if value > 0 else 1.0 for value in scaler.scale_),
        classes=classes,
        coefficients=tuple(tuple(float(value) for value in row) for row in classifier.coef_),
        intercepts=tuple(float(value) for value in classifier.intercept_),
        calibration_offset=float(calibration_offset),
        metrics=metrics,
        dataset_fingerprint=dataset_fingerprint(records[:test_end]),
        seed=seed,
    )


def train_models(records: list[SyntheticRecord], seed: int = 7) -> dict[str, ModelArtifact]:
    validate_dataset(records)
    if len(records) < 60:
        raise ValueError("at least 60 records are required for temporal train/test splits")
    train_end = int(len(records) * 0.7)
    validation_end = int(len(records) * 0.85)
    test_end = len(records)
    if len({train_end, validation_end, test_end}) < 3:
        raise ValueError("dataset is too small for temporal splits")

    artifacts: dict[str, ModelArtifact] = {}
    for label in (
        "liquidation_within_1h",
        "liquidation_within_6h",
        "liquidation_within_24h",
        "liquidation_within_7d",
    ):
        artifacts[label] = _fit_artifact(
            records,
            label,
            _labels(records, label),
            seed,
            train_end,
            validation_end,
            test_end,
        )

    regime_values = np.asarray(
        [
            {
                "stable": 0,
                "trending": 1,
                "high_volatility": 2,
                "liquidity_stress": 3,
                "flash_crash": 4,
                "recovery": 5,
            }[str(record.labels["regime"])]
            for record in records
        ],
        dtype=np.float64,
    )
    regime = _fit_artifact(
        records, "regime", regime_values, seed, train_end, validation_end, test_end
    )
    regime = ModelArtifact(
        **{
            **regime.__dict__,
            "classes": tuple(
                str(item)
                for item in (
                    "stable",
                    "trending",
                    "high_volatility",
                    "liquidity_stress",
                    "flash_crash",
                    "recovery",
                )
            ),
        }
    )
    artifacts["regime"] = regime
    return artifacts


def save_artifacts(artifacts: dict[str, ModelArtifact], directory: Path) -> dict[str, object]:
    directory.mkdir(parents=True, exist_ok=True)
    for task, artifact in artifacts.items():
        (directory / f"{task}.json").write_text(
            json.dumps(artifact.as_dict(), sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )
    report: dict[str, object] = {
        "model_schema_version": MODEL_SCHEMA_VERSION,
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "models": {task: artifact.metrics for task, artifact in artifacts.items()},
        "dataset_fingerprints": sorted(
            {artifact.dataset_fingerprint for artifact in artifacts.values()}
        ),
    }
    (directory / "training-report.json").write_text(
        json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8"
    )
    return report


def load_artifact(path: Path) -> ModelArtifact:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("model artifact must contain a JSON object")
    return ModelArtifact.from_dict(payload)


def _probabilities(artifact: ModelArtifact, features: dict[str, int | float]) -> dict[str, float]:
    if set(features) != set(artifact.feature_columns):
        raise ValueError("feature columns do not match model schema")
    vector = np.asarray(
        [
            (float(features[column]) - artifact.means[index]) / artifact.scales[index]
            for index, column in enumerate(artifact.feature_columns)
        ],
        dtype=np.float64,
    )
    if not np.isfinite(vector).all():
        raise ValueError("features contain a non-finite value")
    logits = np.asarray(
        [
            float(np.dot(row, vector) + artifact.intercepts[index])
            for index, row in enumerate(artifact.coefficients)
        ],
        dtype=np.float64,
    )
    if len(artifact.classes) == 2 and len(logits) == 1:
        logits = np.asarray([0.0, logits[0] + artifact.calibration_offset], dtype=np.float64)
    logits -= np.max(logits)
    values = np.exp(logits)
    values /= values.sum()
    return {label: float(values[index]) for index, label in enumerate(artifact.classes)}


def predict_artifact(artifact: ModelArtifact, features: dict[str, int | float]) -> dict[str, float]:
    return _probabilities(artifact, features)


def in_distribution(
    artifact: ModelArtifact, features: dict[str, int | float], max_z_score: float = 8.0
) -> bool:
    try:
        vector = np.asarray(
            [
                (float(features[column]) - artifact.means[index]) / artifact.scales[index]
                for index, column in enumerate(artifact.feature_columns)
            ],
            dtype=np.float64,
        )
    except (KeyError, TypeError, ValueError):
        return False
    return bool(np.isfinite(vector).all() and np.max(np.abs(vector)) <= max_z_score)
