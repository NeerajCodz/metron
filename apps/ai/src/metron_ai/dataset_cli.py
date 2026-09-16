from __future__ import annotations

import argparse
import json
from pathlib import Path

from metron_ai.dataset import DatasetConfig, generate_dataset, write_jsonl


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate deterministic synthetic Metron portfolio data"
    )
    parser.add_argument("--rows", type=int, default=1_000)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--output", type=Path, default=Path("data/synthetic/portfolio.jsonl"))
    args = parser.parse_args()
    report = write_jsonl(
        generate_dataset(DatasetConfig(rows=args.rows, seed=args.seed)),
        args.output,
    )
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
