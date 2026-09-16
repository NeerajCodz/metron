from __future__ import annotations

import argparse
import json
from pathlib import Path

from metron_ai.dataset import read_jsonl
from metron_ai.ml import save_artifacts, train_models


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Metron risk models from JSONL data")
    parser.add_argument("--input", type=Path, default=Path("data/synthetic/portfolio.jsonl"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/models"))
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    report = save_artifacts(train_models(read_jsonl(args.input), seed=args.seed), args.output)
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
