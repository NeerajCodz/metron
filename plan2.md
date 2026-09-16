# Metron second-pass implementation plan

## Scope

This plan covers the backend, AI, and Web3 work only. The frontend remains outside this pass and will not be edited.

The first implementation added the main contracts, Convex entities, solver auction, keeper triggers, AI HTTP service, SDK, and local safety tests. A source audit against `docs/idea.md`, `docs/spec.md`, and the 43 records in `docs/requirements.json` found that several product claims are still represented by deterministic placeholders or narrow adapters. File existence and passing unit tests do not prove those features are complete.

## Audit result

### Covered well enough for the current backend scope

- User-controlled authorization, intent lifecycle, canonical validation, commitments, and replay protection.
- Vault custody and reservation accounting.
- Aave supply, borrow, repay, withdraw, and health-factor checks.
- Uniswap v4 liquidity add/remove paths and risk-limit hook checks.
- Delta policy, bounded hedge rebalance, cooldown, and duplicate execution protection.
- Sealed solver commitments, reveal validation, deterministic route scoring, settlement, and minimum-output checks.
- LayerZero message authentication, nonce ordering, expiry, retry state, and remote target allowlists.
- Emergency modes, atomic same-chain unwind paths, recovery execution, and objective insurance claims.
- Convex ownership checks, position components, risk snapshots, execution records, cross-chain states, notifications, and trace identifiers.
- Backend-only health, readiness, ABI, deployment, and regression checks.

### Partial or shallow

1. **Intent parsing.** The parser uses regular expressions. It does not reliably extract intent type, target delta, drawdown, impermanent-loss, protocol, chain, asset, borrow, hedge, or automation constraints, and it cannot reject ambiguous values with field-level reasons.
2. **Strategy generation.** `buildCandidateRoutes` emits only one-action lending or liquidity routes from caller-supplied snapshots. It does not build combined lending, LP, hedge, bridge, or recovery strategies.
3. **Cross-chain strategy construction.** LayerZero contracts carry messages, but the off-chain route model does not create a multi-stage bridge plus destination execution graph or reconcile its lifecycle into a portfolio strategy.
4. **Yield aggregation.** Ranking accepts precomputed market snapshots. There is no market discovery, normalized rate history, capacity handling, or protocol-risk observation feed.
5. **Concentrated-liquidity intelligence.** The chain adapter reads pool state and position liquidity, but does not calculate range drift, fees, impermanent loss, token composition, or rebalance cost from observations.
6. **Automation coverage.** Keeper triggers cover health, delta, LP drift, timeout, volatility, stablecoin deviation, protocol health, and a risk score. They do not consume yield changes, borrowing cost, gas, opportunity decay, or explicit recovery plans.
7. **Risk intelligence.** Liquidation and regime endpoints are deterministic heuristics with a `risk-deterministic-v1` label. No trained model, historical dataset, calibration report, feature lineage, or model artifact is used.
8. **Dynamic thresholds.** Threshold selection applies user and administrator bounds plus hysteresis. It is not sensitive to the detected market regime or liquidity conditions.
9. **Cascade simulation.** The current model applies one aggregate price impact and checks positions once. It does not iterate forced selling, liquidity consumption, price impact, and secondary liquidations.
10. **Stress simulation.** The simulator handles a limited set of scalar shocks. It does not model joint portfolio components, hedge effectiveness, LP composition, bridge state, protocol failure, or gas and slippage interactions.
11. **Explainability and natural-language analysis.** Explanation is a pass-through of caller-provided strings, and position answers echo indexed values. It does not ground responses in typed observations, calculations, model versions, or scenario IDs, and it does not refuse unsupported questions with structured missing-data reasons.
12. **Risk monitoring.** Stablecoin and protocol fields exist in snapshots and keeper observations, but there is no observation ingestion pipeline that derives them from Chainlink, Aave, Uniswap, bridge, and execution data.
13. **Privacy proofs.** Noir circuits and wrapper interfaces exist, and native proof generation works. Generated Solidity verifier output is not yet integrated into the repository's via-IR Foundry build or exercised by an on-chain proof submission.
14. **Lending-based hedging.** The hedge manager supports an adapter execution but the route builder and portfolio model do not generate or score a lending-based hedge as a strategy component.
15. **Portfolio graph and audit presentation.** Backend records support components and activity, but no backend graph projection or complete event timeline query exists for the frontend to consume as one strategy graph.

### Frontend-only items not audited as implementation gaps

Wallet connection screens, strategy graph rendering, solver comparison dashboard, risk dashboard, simulator screens, settings screens, and activity timeline presentation belong to `apps/web`, which is being handled separately. The backend contracts and query shapes needed by those screens remain in scope here.

## Execution order

### Phase 1: Complete deterministic product behavior

1. Extend shared types for portfolio components, bridge stages, hedge actions, market observations, LP metrics, and typed audit events.
2. Replace one-action route generation with composable candidate graphs that can include lending, LP, hedge, bridge, and recovery stages while preserving user allowlists and deadlines.
3. Add an off-chain market observation registry with normalized rates, liquidity, gas, protocol health, stablecoin deviation, oracle quality, and timestamp/chain provenance.
4. Add portfolio aggregation and graph/timeline projections in Convex. Reconcile component updates, cross-chain state changes, risk snapshots, and execution events idempotently.
5. Add LP range, composition, fee, IL, hedge effectiveness, borrow-cost, gas, and opportunity-decay calculations. Feed their outputs to route scoring and keeper eligibility.
6. Make dynamic intervention thresholds consume regime, liquidity stress, and protocol health inputs while remaining bounded by user and administrator policy.
7. Replace the one-pass cascade calculation with bounded iterative propagation and explicit convergence or truncation metadata.
8. Make stress scenarios operate on typed portfolio components and return component-level effects, assumptions, and data provenance.
9. Make explanations and position analysis consume typed indexed data, deterministic calculations, predictions, and scenario references. Return structured refusal reasons when required inputs are absent.
10. Complete generated verifier integration through a reproducible ZK build profile, namespaced verifier artifacts, wrapper compatibility checks, and a local proof submission smoke test.

Acceptance criteria:

- A route can represent lending, liquidity, hedge, and cross-chain stages in one strategy graph.
- Every calculated risk and cost field carries observation time and source metadata.
- Keeper evaluation reacts to all configured strategy limits, including yield, borrow cost, gas, and opportunity decay.
- Cross-chain state transitions and retries are reflected in the unified position projection.
- Cascade and stress results expose per-component effects and bounded iteration metadata.
- Explanation responses cannot claim a value that is absent from indexed data, deterministic calculations, model output, or declared scenario assumptions.
- A Noir proof generated by the checked-in workflow verifies through a deployed generated Solidity verifier on local Anvil.

### Phase 2: Build a reproducible synthetic ML dataset

1. Define `features-v2` schemas for position snapshots, market observations, portfolio components, action outcomes, and labels.
2. Generate correlated synthetic histories with Faker for users, wallets, protocols, chains, pools, lending accounts, hedge positions, bridge messages, gas, slippage, and risk events. Use deterministic seeds and explicit scenario families.
3. Generate labels for liquidation within 1h, 6h, 24h, and 7d; market regime; cascade severity; recovery success; expected loss; and intervention action quality.
4. Store JSONL or Parquet-compatible records with schema version, seed, scenario ID, timestamp, source type, and label provenance. Keep generated data out of production credentials and real user data.
5. Add distribution, missingness, leakage, class-balance, temporal-split, and invariant checks. Reject datasets that violate accounting, chronology, or policy constraints.

Acceptance criteria:

- The same seed produces byte-identical dataset records.
- Dataset generation covers stable, trending, high-volatility, liquidity-stress, flash-crash, recovery, depeg, bridge-failure, gas-spike, and compound scenarios.
- Labels are derived from simulated future outcomes, not copied from input features.
- Temporal train/validation/test splits prevent future leakage.
- Dataset reports include class balance, feature ranges, missingness, and scenario coverage.

### Phase 3: Train and evaluate risk models

1. Train calibrated baseline models for liquidation probability and market regime classification using the generated data.
2. Add cascade severity and recovery ranking models only after baseline label quality is verified.
3. Persist model artifacts with model version, feature schema version, training dataset fingerprint, seed, metrics, and calibration metadata.
4. Evaluate precision/recall, AUROC or multiclass metrics, calibration error, scenario performance, and fail-closed behavior. Compare every model against the deterministic safety baseline.
5. Keep deterministic bounds authoritative. A model may recommend or rank actions but may not bypass user, administrator, protocol, oracle, or emergency limits.

Acceptance criteria:

- No model is promoted unless it beats or matches the deterministic baseline on defined holdout metrics and calibration checks.
- Predictions include model, feature, dataset, and trace provenance.
- Unavailable, stale, malformed, or out-of-distribution inputs produce an explicit fallback with bounded output.
- Training is reproducible from the checked-in generator, configuration, and seed.

### Phase 4: Integrate and operate ML safely

1. Add artifact loading and health checks to the AI service.
2. Add model-backed inference behind the existing authenticated endpoints with deterministic fallback.
3. Record prediction requests, outputs, feature fingerprints, model versions, fallback state, and latency in Convex and observability events.
4. Add drift and data-quality reports for synthetic and future live observations.
5. Run backend tests, model evaluation, HTTP smoke tests, and local Web3 lifecycle tests without touching frontend files.

## Release gates

The product is not production-ready until live protocol fork tests, generated verifier on-chain submission, production deployments, and container startup pass with real infrastructure. Synthetic ML results do not substitute for those integration checks.
