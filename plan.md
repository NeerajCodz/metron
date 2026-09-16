# Metron backend, AI, and Web3 implementation plan

## 1. Completion target

Build the complete non-frontend Metron system described by `docs/spec.md`, using `docs/idea.md` for product behavior and `docs/structure.md` for repository boundaries.

Completion means:

- every normative backend, AI, Web3, shared-package, infrastructure, security, and verification requirement in `docs/spec.md` is implemented;
- concrete optional modules described in the specification are included rather than left as stubs: the Uniswap v4 hook, ownership and collateral circuits, Chainlink Automation compatibility, and the parametric insurance reserve;
- all capital movement is authorized and checked by smart contracts;
- Convex, AI, solvers, and keepers remain untrusted control-plane services;
- the complete lifecycle works on local infrastructure and the selected EVM testnets without a frontend, using SDK calls, scripts, and end-to-end test drivers;
- deployment records, runbooks, generated ABIs, model reports, and test evidence are present.

This is not an MVP-only plan. It covers the full concrete system in the technical specification. The open-ended future ideas in `docs/idea.md` section 41, such as arbitrary extra protocols, arbitrary additional chains, derivatives providers, institutional policy layers, and production insurance underwriting, do not have enough named integrations or acceptance criteria to implement safely. The architecture will support adding them, but they are not part of this completion target unless the plan is amended with specific providers and networks.

## 2. Scope boundary

### Included

- `apps/backend`: Convex data model, queries, mutations, actions, HTTP endpoints, crons, event indexing, projections, AI orchestration, solver metadata, alerts, and notifications.
- `apps/ai`: FastAPI service, feature pipelines, predictive and deterministic models, optimizers, simulations, LLM adapters, model artifacts, evaluation, drift metadata, and safe fallbacks.
- `apps/web3`: Solidity contracts, Foundry tests and deployments, Noir circuits, Barretenberg proof workflow, off-chain protocol adapters, solver, keeper, chain configuration, testnet deployments, and runtime processes.
- Shared packages required by those applications: `sdk`, `abi`, `protocol`, `types`, `validation`, `config`, `logger`, `eslint-config`, and `typescript-config`.
- Infrastructure: local Docker composition, runtime images, monitoring configuration, deployment scripts, CI workflows, environment validation, and testnet deployment records.
- Documentation required to operate and verify the non-frontend system.
- End-to-end drivers that exercise the system directly through Convex, FastAPI, the SDK, RPC, and deployed contracts.

### Excluded

- `apps/web` implementation.
- `packages/ui` implementation.
- React pages, wallet components, dashboards, charts, and browser interaction.
- Mainnet deployment or claims of production readiness.
- Production underwriting, anonymous funding claims, exact continuous delta neutrality, atomic cross-chain rollback, or complete MEV prevention.

Frontend-facing contracts are still included. The SDK, ABI package, validation schemas, Convex functions, and proof APIs must be ready for a later frontend without depending on frontend code.

## 3. Fixed architecture and safety rules

1. Use a pnpm and Turborepo monorepo. Use Bun for TypeScript solver and keeper runtimes.
2. Keep Convex in `apps/backend`, Python and FastAPI in `apps/ai`, and every blockchain component in `apps/web3`.
3. Keep Noir circuits in `apps/web3/zk`. Put generated, versioned Solidity verifiers in `apps/web3/contracts/zk`.
4. Treat on-chain contracts and integrated protocols as the financial ledger. Convex stores indexed projections only.
5. Require user authorization or narrowly scoped automation authorization for capital-moving actions.
6. Make solver, keeper, AI, Convex, RPC, and quote providers untrusted. Contracts validate deadlines, nonces, allowlists, slippage, oracle freshness, capital limits, and resulting health constraints.
7. Use fixed-width integer or fixed-point financial arithmetic. Solidity does not use floating point.
8. Fail closed for stale, invalid, negative, or out-of-bounds oracle data on risk-increasing actions.
9. Give each intent, solver result, settlement, cross-chain message, recovery action, and emergency event a trace identifier.
10. Make event ingestion and cross-chain processing idempotent and replay safe.
11. Use versioned schemas for intents, routes, AI responses, commitments, circuits, generated verifiers, ABIs, and model artifacts.
12. Pull chain addresses, oracle feeds, LayerZero endpoint identifiers, protocol deployments, and external API details from current official sources during implementation. Do not copy stale values from the planning documents.
13. Prefer versioned contract redeployment and explicit migration over upgradeable proxies for asset-holding contracts.
14. Do not put unrestricted signing keys in Convex, FastAPI, solver, keeper, or client configuration.

## 4. Proposed decisions for approval

These choices resolve the open decisions in `docs/spec.md` section 36. Implementation will validate them against current official testnet support before contracts are deployed.

| Decision                 | Proposed choice                                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deposit privacy          | Public testnet deposit amounts with private intent parameters. Also implement ownership and collateral proof circuits, but make amount-private funding a separate proof capability rather than an anonymity claim.     |
| Uniswap v4 setup         | Select currently supported testnet pool keys from official deployments. Include one bounded risk-aware hook and a local Anvil deployment path when a matching public testnet pool is unavailable.                      |
| Initial hedge            | Aave V3 borrow plus Uniswap swap for a lending-based short. No derivatives protocol is added without a named provider.                                                                                                 |
| Cross-chain asset model  | Use LayerZero V2 for control messages and a documented prefunded destination executor for the first complete testnet route. Never describe OApp messaging as token bridging.                                           |
| Solver scoring           | Use deterministic, versioned score weights. Start from protocol defaults, apply explicit intent preferences, and allow bounded regime inputs. Persist every score component.                                           |
| Rebalance cadence        | Use configurable cooldown and hysteresis. Validate safe defaults through simulation and fork tests before deployment rather than hard-coding an unsupported interval in this plan.                                     |
| Automation trigger       | Run the custom keeper as the primary orchestrator. Implement Chainlink Automation-compatible deterministic checks and execution as a second trigger path where supported.                                              |
| Oracle deviation         | Use Chainlink as the approved primary feed and a configured Uniswap TWAP or second approved observation for deviation checks where the selected asset and pool support it.                                             |
| Emergency administration | Use role-separated OpenZeppelin access control. Deployment scripts transfer testnet administration to configured multisig addresses when supplied and reject production-like deployment with a default deployer owner. |
| Insurance                | Implement a separately funded testnet reserve with deterministic triggers, caps, and accounting. Make no production underwriting claim.                                                                                |
| Product naming           | Use `metron` for package, service, contract deployment, and telemetry namespaces. Treat Isorropia as the concept name found in `docs/idea.md` unless naming is changed before implementation.                          |

## 5. Delivery phases

Each phase ends with its own focused checks. A phase is complete only after its behavior is exercised, not merely compiled.

### Phase 0: repository baseline and shared contracts

Create the monorepo and lock toolchain versions.

Deliverables:

- root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, TypeScript and lint configuration, Python tooling, Foundry configuration, and environment templates;
- workspace scripts for build, typecheck, lint, test, ABI generation, address synchronization, environment validation, local chain startup, seeding, and service startup;
- `packages/types` domain types for canonical intents, intent versions, routes, position components, positions, solver bids, risk snapshots, AI outputs, cross-chain state, recovery actions, and activity records;
- `packages/validation` Zod schemas matching the public TypeScript contracts;
- `packages/protocol` deterministic math for normalization, commitment inputs, health projections, delta, yield and cost accounting, route scoring, and recovery eligibility;
- `packages/config` with typed chain, asset, protocol, oracle, LayerZero, feature, and deployment configuration;
- `packages/logger` with trace and domain identifiers in every structured record;
- package dependency boundaries that prevent public packages from importing Convex internals;
- a machine-readable requirement inventory mapping FR-003 through FR-033 and NFR-001 through NFR-010 to implementation and verification paths. FR-001 is frontend-only. The signing and authorization parts of FR-002 remain in scope.

Checks:

- all workspace dependency boundaries and build graphs resolve;
- intent normalization and serialization produce stable vectors across TypeScript, Python fixtures, Solidity encoding fixtures, and Noir inputs;
- schema compatibility tests reject unknown versions and out-of-range financial values.

### Phase 1: deterministic Web3 core

Implement the contracts that custody assets and enforce the intent envelope.

Deliverables:

- `Vault.sol` for deposits, position entitlements, withdrawals, and lower-risk holding state;
- `IntentManager.sol` for versioned intent commitments, authorization, nonce handling, expiry, cancellation, and replay protection;
- `PositionManager.sol` for position identity, per-chain component references, lifecycle state, and automation policy hashes;
- `StrategyExecutor.sol` for allowlisted, deterministic action execution;
- `RiskController.sol` for user limits, protocol limits, oracle gates, capital movement bounds, slippage, minimum health factor, and risk mode checks;
- `RecoveryExecutor.sol` for bounded repayment, deleveraging, swaps, hedge changes, LP changes, combined actions, and safe-state movement;
- interfaces and libraries for fixed-point risk math, health-factor handling, delta, identifiers, deadlines, and safe token transfers;
- structured events carrying trace, intent, position, action, and status identifiers;
- explicit role separation, reentrancy protection, checks-effects-interactions ordering, pause behavior, and safe approval handling.

Checks:

- unit tests for every public state transition and rejection path;
- fuzz tests for amount scaling, decimals, deadlines, slippage, nonces, capital limits, health boundaries, and delta thresholds;
- invariants for entitlement isolation, asset conservation, expiry, mode permission monotonicity, and bounded automation;
- direct Anvil flow for deposit, intent authorization, deterministic execution, recovery authorization, and withdrawal.

### Phase 2: oracle, Aave, and Uniswap integrations

Add real protocol adapters without duplicating external protocol accounting.

Deliverables:

- `ChainlinkOracle.sol` and adapter interfaces with positive-price, decimals, freshness, maximum-age, and optional deviation checks;
- `AaveV3Adapter.sol` and `LendingManager.sol` for supply, borrow, repay, withdraw, authoritative account data, and flash-loan entry points;
- `UniswapV4Adapter.sol` and `LiquidityManager.sol` for pool identification, quotes, swaps, add/remove liquidity, valuation, tick range, fees, in-range status, estimated impermanent loss, and delta contribution;
- one custom Uniswap v4 hook with bounded parameters, rate limits, state or time gates, role controls, event emission, and reentrancy defense;
- off-chain Aave, Uniswap, and Chainlink readers for rates, market state, pool depth, quotes, and feed metadata;
- deterministic position simulation using approved inputs while preserving Aave as the authority for live Aave state.

Checks:

- fork tests against current supported protocol deployments when RPC access permits;
- local integration fixtures when a public testnet feature is unavailable;
- stale, invalid, negative, decimal-mismatch, and deviation oracle tests;
- swap and LP slippage tests, Aave health-factor boundary tests, hook fuzz tests, and hook invariants;
- a direct script opens, reads, changes, and closes a supported lending or liquidity position.

### Phase 3: Convex backend and indexer

Build the application control plane and read model.

Deliverables:

- Convex schema and indexes for users, wallets, intents, intent versions, positions, position components, strategies, solver registry, bid commits, bid reveals, executions, chain transactions, cross-chain messages, risk snapshots, AI predictions, alerts, notifications, protocol metrics, and indexer cursors;
- intent draft, publish, version, cancel, and query functions with canonical validation;
- solver registration, auction-window metadata, commit/reveal records, candidate results, and selection records;
- position, strategy, risk, activity, and notification queries;
- HTTP endpoints for authenticated internal AI, solver, keeper, and indexer calls;
- on-chain event indexers for each supported chain with persisted cursors, confirmation policy, deterministic replay, reorg handling, duplicate suppression, and reconciliation against RPC state;
- cross-chain pending, acknowledged, failed, expired, and recovery-required projections;
- AI response persistence with request schema, response schema, model version, feature version, timestamp, confidence or calibration metadata, and trace identifiers;
- crons for indexing, reconciliation, risk refresh, alerts, message timeout checks, and notification delivery;
- degraded behavior where on-chain funds remain accessible and direct RPC reads remain possible if Convex is unavailable.

Checks:

- Convex validation and generated API checks pass;
- replaying the same event range produces no duplicate financial activity or notifications;
- cursor restart resumes from the last accepted block;
- simulated reorg replaces affected projections and then reconciles to on-chain state;
- malformed and unauthorized service calls fail;
- projection values can be traced back to chain, transaction, log, and block data.

### Phase 4: solver marketplace and settlement

Implement competing routes, deterministic scoring, commit/reveal, and on-chain settlement validation.

Deliverables:

- route builders for lending, liquidity, hedging, and cross-chain strategies;
- candidate generation from allowed chains, protocols, current rates, LP state, fees, gas, prices, liquidity, projected delta, projected health, and AI risk outputs;
- at least two valid candidates for qualifying intents;
- route simulations with explicit validity deadlines and failure reasons;
- deterministic score components for expected net APY, execution cost, gas, slippage, liquidity, drawdown, liquidation probability, impermanent loss, cross-chain cost, allowlist compliance, delta, and health factor;
- `SolverRegistry.sol`, `SolverSettlement.sol`, and `IntentSettlement.sol`;
- sealed commit/reveal windows, commitment verification, bid expiry, winner selection, settlement authorization, and route replay protection;
- short settlement deadlines, minimum outputs, optional batching hooks, and route disclosure only when needed;
- no claim of complete MEV prevention;
- testnet solver identity and optional bond or reputation metadata without pretending omitted slashing exists.

Checks:

- the same bids and risk inputs always select the same winner;
- unrevealed, altered, expired, replayed, out-of-envelope, or unauthorized bids cannot settle;
- solver output cannot bypass contract limits;
- a direct end-to-end driver creates an intent, receives two candidates, completes commit/reveal, selects a winner, and settles the route.

### Phase 5: AI service, models, optimization, and explanations

Build the advisory AI and numerical simulation layer. No model receives a signing key or direct execution authority.

Deliverables:

- FastAPI application with versioned request and response schemas;
- `/v1/liquidation/predict` with short, medium, and long horizon probabilities, confidence, timestamp, model version, and feature schema version;
- `/v1/recovery/rank` with partial repayment, collateral sale, collateral swap, hedge adjustment, reserve repayment, LP adjustment, safe-state movement, and combined candidates;
- constrained recovery optimization that scores loss, slippage, gas, execution cost, future liquidation risk, delta deviation, liquidity, and user permissions;
- `/v1/regime/classify` with stable, trending, high-volatility, liquidity-stress, flash-crash, and recovery probabilities;
- dynamic intervention threshold recommendations bounded by user and administrator limits;
- personalized recommendations driven first by explicit user policy and adjusted only inside that policy by accepted or rejected recommendation history;
- liquidity and route estimates for depth, price impact, slippage distribution, gas, failure probability, and opportunity decay;
- yield-risk, allocation, hedge, and route optimization services;
- `/v1/cascade/simulate` for forced-selling volume, consumed depth, secondary price impact, newly liquidatable positions, affected count, and secondary exposure;
- `/v1/stress/simulate` for explicit price, depeg, liquidity, volatility, utilization, oracle, and gas scenarios;
- natural-language intent and scenario parsers that return structured drafts for approval rather than authorized actions;
- `/v1/explain` that separates observed data, deterministic calculations, model predictions, and scenario assumptions;
- natural-language position answers generated only from supplied indexed data and numerical simulation outputs;
- artifact manifests containing model version, feature schema, training period, dataset provenance, evaluation report, calibration metrics, fallback behavior, and drift plan;
- deterministic fallback rules for service failure, out-of-distribution inputs, invalid outputs, and missing features.

Model approach:

- use transparent deterministic baselines before trained models;
- use time-aware train, validation, and test splits where training data is available;
- add XGBoost or PyTorch only when evaluation shows an improvement over the baseline;
- use synthetic and fork-derived scenarios for coverage, and label them as simulated data;
- reject outputs outside schema or configured numerical ranges;
- never fabricate a trained model or evaluation metric when suitable data is absent. In that case, ship the deterministic model with an honest artifact report and keep the same versioned API.

Checks:

- API contract tests against Convex and shared fixtures;
- calibration, horizon consistency, regime confusion matrix, recovery simulation or backtest, sensitivity, out-of-distribution, and deterministic fallback tests;
- identical deterministic scenarios produce identical simulation results;
- explanation tests prove that every number comes from an input, calculation, model result, or named scenario assumption;
- service outage and malformed output paths preserve deterministic protocol safety.

### Phase 6: delta hedging, automation, and keeper

Maintain bounded positions after initial settlement.

Deliverables:

- deterministic net-delta calculation from lending, wallet, and LP components using approved prices;
- `HedgeManager.sol` with target delta, tolerance, position health constraints, and Aave-based short execution;
- `PositionAutomation.sol`, `RebalanceAutomation.sol`, and `EmergencyAutomation.sol` with deterministic eligibility checks;
- cooldown, hysteresis, minimum-benefit, gas, slippage, liquidity, volatility, and health impact gates;
- keeper monitors for health factor, delta, LP range, volatility regime, stablecoin deviation, protocol status, cross-chain timeouts, and risk score;
- keeper triggers for bounded recovery, hedge rebalance, LP recentering, message recovery, and emergency unwind;
- Chainlink Automation-compatible check and perform functions where supported;
- retry and idempotency behavior that cannot submit the same financial action twice;
- keeper credentials limited to roles that cannot withdraw arbitrary user funds.

Checks:

- LP drift triggers a hedge recommendation and permitted rebalance;
- changes inside tolerance or cooldown do not churn the position;
- high gas, shallow liquidity, stale oracle data, poor resulting health, or user limits block execution;
- keeper loss delays automation but grants no additional authority;
- repeated trigger delivery does not duplicate execution.

### Phase 7: LayerZero cross-chain execution

Implement asynchronous cross-chain coordination across Ethereum Sepolia, Arbitrum Sepolia, and Base Sepolia.

Deliverables:

- `CrossChainRouter.sol`, `LayerZeroAdapter.sol`, and per-chain `RemoteExecutor.sol` contracts using the current LayerZero V2 OApp interfaces;
- authenticated peer configuration and deployment validation;
- messages containing version, source chain, source contract, intent or position, action type, payload hash, nonce, and expiry;
- remote validation of endpoint caller, source peer, version, nonce, expiry, local allowlists, and local risk constraints;
- explicit states for created, source locked, sent, destination received, destination executed, acknowledgment sent, confirmed, expired, failed, and recovery required;
- retry, timeout, failure, and recovery handling without pretending that another chain rolled back;
- one working testnet application message path between two supported chains;
- one complete asset execution path using documented prefunded destination liquidity, with accounting and limits separated from LayerZero messaging;
- unified logical positions with per-chain component decomposition.

Checks:

- valid delivery and acknowledgment;
- duplicate, wrong-peer, expired, out-of-order, delayed, and destination-revert cases;
- no message executes twice;
- timeout does not mark remote work as rolled back;
- a direct driver records the full source and destination state sequence and reconciles both chains.

### Phase 8: ZK intent, ownership, and collateral proofs

Implement private intent authorization without overstating privacy.

Deliverables:

- deterministic, versioned intent normalization and ZK-friendly commitment domain;
- Noir intent circuit proving commitment consistency, non-expiry, non-empty allowed chains, and bounded APY, drawdown, and slippage constraints;
- Noir ownership circuit for commitment control, Merkle membership where used, domain separation, and nullifier derivation;
- Noir collateral circuit proving a private collateral value meets a minimum;
- Barretenberg compile, proof generation, verification, and Solidity verifier generation scripts;
- versioned `ZKIntentVerifier.sol`, `ZKOwnershipVerifier.sol`, and `ZKCollateralVerifier.sol` integration;
- on-chain nullifier consumption and replay rejection;
- SDK helpers for witness construction, proof generation, public input encoding, and proof submission;
- explicit documentation that ordinary EVM deposits remain public and that execution paths are not automatically private.

Checks:

- valid witnesses pass;
- modified public inputs, invalid Merkle paths, expired intents, and boundary violations fail;
- a consumed nullifier cannot be reused;
- Noir and Solidity verifier vectors match;
- at least one proof is generated and verified on-chain in the selected testnet environment.

### Phase 9: emergency controls, unwind, and insurance

Complete capital-protection behavior.

Deliverables:

- `CircuitBreaker.sol` with `NORMAL`, `RESTRICTED`, and `EMERGENCY` states;
- a permission matrix in which each more restrictive state can only remove actions, except for explicitly permitted recovery, unwind, and safe withdrawal paths;
- automatic and administrative transition rules with structured events and reason codes;
- same-chain flash unwind that repays debt, releases collateral, removes LP exposure, closes or adjusts the hedge, converts assets, repays flash liquidity, and leaves residual funds in the vault;
- transaction atomicity for every same-chain flash unwind;
- cross-chain recovery kept as an asynchronous state machine;
- `InsuranceReserve.sol` isolated from normal recovery, funded explicitly, capped by reserve capacity, and driven only by verifiable price, oracle-divergence, message-path, or configured protocol triggers;
- no insurance payout based solely on AI output.

Checks:

- restricted and emergency modes reject configured risk-increasing operations;
- emergency mode never has broader permissions than normal mode;
- failed flash settlement leaves no partial same-chain state;
- insurance claims cannot exceed coverage, reserve, duration, trigger, or replay limits;
- the emergency flow works in a fork or realistic local scenario.

### Phase 10: SDK, ABI, runtime packaging, and observability

Make the non-frontend system usable and operable.

Deliverables:

- generated, versioned `packages/abi` output with a consistency check against compiled contracts;
- `packages/sdk` clients for commitments, proof generation, intent submission, deposit quotes, deposits, position reads, health reads, solver results, settlement, withdrawal, and recovery simulation;
- clients for Convex and AI APIs without Convex internals leaking into public packages;
- structured logs and metrics for backend, AI, solver, keeper, indexer, and deployment scripts;
- trace correlation across Convex records, AI calls, solver runs, keeper decisions, transactions, and cross-chain messages;
- failure codes and alerts for stale oracles, service outages, delayed messages, failed execution, invalid proofs, model rejection, depeg, and emergency transitions;
- Docker images for AI, solver, and keeper plus local composition for Convex development, FastAPI, Anvil, solver, and keeper;
- health and readiness endpoints that check dependencies without claiming financial readiness from process liveness alone.

Checks:

- SDK smoke flow can perform every user-independent backend and contract operation required by the lifecycle;
- generated ABIs match contract artifacts;
- one trace can be followed across every involved service and chain event;
- containers start from a clean checkout with documented environment inputs.

### Phase 11: deployment, security hardening, and operations

Prepare repeatable local and testnet operation.

Deliverables:

- deployment scripts for Ethereum Sepolia, Arbitrum Sepolia, Base Sepolia, and optional Optimism Sepolia configuration;
- deployment records containing address, chain ID, deployment transaction, bytecode hash, compiler version, source commit, and timestamp;
- peer, role, allowlist, oracle, protocol, and automation configuration scripts with read-back verification;
- secret separation for RPC keys, AI credentials, limited automation keys, relay credentials, and monitoring credentials;
- threat model covering trust boundaries, asset custody, solver manipulation, oracle failure, cross-chain replay, keeper compromise, model failure, ZK replay, and Convex projection errors;
- trust assumptions, emergency procedure, key rotation, deployment, rollback, recovery, and incident runbooks;
- dependency, Solidity static analysis, Python and TypeScript security checks, secret scanning, and generated-artifact checks in CI;
- separate manually approved contract deployment workflow;
- no default keys, unrestricted testnet operators, placeholder addresses, or undocumented privileged paths.

Checks:

- deployment scripts reject missing official configuration and unsafe role ownership;
- deployed bytecode and configuration match recorded artifacts;
- security checks pass or have a documented, approved exception tied to a concrete reason;
- emergency procedures are exercised against local or testnet deployments.

### Phase 12: full-system verification and release evidence

Run the system as a whole through direct drivers instead of a frontend.

Required end-to-end scenarios:

1. Create canonical intent, create commitment, generate proof, collect solver bids, select a winner, validate settlement, and execute.
2. Open an Aave lending position, apply a price shock, observe increased risk, rank bounded recovery actions, execute one, and restore the required health factor.
3. Deploy or simulate a concentrated liquidity position, observe delta drift, and execute an eligible hedge rebalance.
4. Send a LayerZero instruction, execute on the destination, acknowledge it, and reconcile the unified position.
5. Enter emergency mode and complete an atomic same-chain unwind.
6. Present a stale oracle and prove that a risk-increasing operation fails closed.
7. Stop the AI service and prove that deterministic monitoring and safety rules remain active.
8. Replay backend events and cross-chain messages and prove idempotency.
9. Run a stablecoin or protocol stress case and prove restriction or exit behavior follows configured thresholds.
10. Trigger an eligible insurance condition and prove deterministic, reserve-capped payout accounting.

Release checks:

- TypeScript formatting, lint, typecheck, package tests, and builds;
- Convex schema, API, authorization, indexing, replay, reorg, and reconciliation tests;
- Python formatting, lint, typecheck, API contract tests, model evaluation, simulations, and fallback tests;
- Foundry build, unit, fuzz, invariant, fork, cross-chain, and gas-report checks;
- Noir compilation, circuit tests, verifier vector tests, and on-chain proof verification;
- ABI and address synchronization checks;
- Docker build and clean-environment startup;
- direct testnet smoke scenarios for available live integrations;
- a requirement traceability report with no unimplemented normative backend, AI, or Web3 requirement.

## 6. Acceptance criteria

The implementation is complete when all of the following are true:

- canonical structured intents and natural-language intent drafts are accepted, versioned, validated, committed, and authorized;
- at least one ZK proof is generated and verified on-chain, and all three specified circuits are implemented and tested;
- qualifying intents receive at least two candidate strategies;
- commit/reveal, deterministic scoring, winner selection, and settlement validation work;
- Aave V3 lending operations and account-state reads work on a supported environment;
- Uniswap v4 swap or liquidity operations and the bounded hook work on a supported environment;
- net delta, drift eligibility, hedge simulation, and permitted rebalance work;
- Chainlink price reads enforce freshness and validity;
- LayerZero V2 sends and receives an authenticated message between two supported testnets;
- the documented prefunded cross-chain execution path reaches confirmed state or an explicit recoverable failure state;
- liquidation predictions include horizons, version, timestamp, confidence or calibration metadata, and explanation;
- recovery ranking returns only actions inside the supplied policy envelope;
- regime, liquidity, cascade, stress, personalization, and natural-language analysis APIs work with versioned schemas and safe fallbacks;
- Convex projections reconcile to chain state and survive duplicate delivery, restart, and tested reorgs;
- keeper and Chainlink-compatible automation cannot exceed user or protocol limits;
- restricted and emergency modes block risk-increasing actions as configured;
- flash unwind is atomic;
- the insurance reserve uses funded capacity and objective triggers only;
- every major action has a traceable audit record;
- all required verification suites pass;
- no off-chain component can bypass smart-contract fund controls;
- the non-frontend lifecycle can be demonstrated from a clean checkout using documented commands and direct drivers.

## 7. Documentation produced during implementation

Documentation is written alongside the working subsystem it describes:

- architecture overview and state ownership;
- backend data model, functions, indexing, reconciliation, and failure behavior;
- AI API, feature schemas, model cards, evaluation, fallback, and drift plan;
- contract and protocol architecture;
- intent serialization and commitment format;
- solver scoring and auction rules;
- Aave, Uniswap, Chainlink, and LayerZero integration notes with official-source references;
- cross-chain state machine and recovery rules;
- ZK circuits, trusted inputs, proof generation, verifier versions, and privacy limits;
- threat model and trust assumptions;
- deployment and configuration guide;
- operations, monitoring, key rotation, emergency, and incident runbooks;
- SDK and internal API reference;
- requirement traceability and release evidence.

## 8. Change control

Implementation begins only after this plan is approved.

Any later change that grants more authority to an off-chain service, changes custody, changes cross-chain asset movement, adds an upgradeable proxy, weakens oracle checks, or expands automation permissions requires an explicit plan amendment before code changes proceed.

## 9. Version control during implementation

- Work directly on the `main` branch as requested.
- Commit every coherent change with a Conventional Commit subject such as `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `perf:`, `build:`, `ci:`, or `chore:`.
- Keep commits small enough to review and revert independently. Do not split unchanged or trivial work only to inflate the commit count.
- Do not add co-author trailers.
- Push each completed commit to `origin/main` before starting the next independent change.
- Preserve user changes and stop before any destructive rewrite of remote history.
