# Metron Technical Specification

| Field | Value |
|---|---|
| Status | Draft |
| Version | 0.1.0 |
| Date | 2026-09-16 |
| Primary environment | EVM testnets |
| Coordination chain | Ethereum Sepolia |
| Execution chains | Arbitrum Sepolia, Base Sepolia |
| Optional execution chain | Optimism Sepolia |
| Repository model | pnpm + Turborepo monorepo |

## 1. Document Purpose

This document specifies the architecture, interfaces, data ownership boundaries, protocol behavior, security requirements, AI/ML responsibilities, Web3 components, deployment model, and verification plan for a privacy-preserving cross-chain DeFi execution system.

The system accepts constrained financial intents, evaluates execution strategies across supported EVM networks and DeFi protocols, executes a selected strategy, maintains target delta exposure, monitors liquidation and market risk, and performs bounded recovery actions when risk limits are violated.

This specification is implementation-oriented. It defines what each subsystem MUST do, which subsystem owns each class of state, how components communicate, which failure modes must be handled, and what constitutes a valid implementation.

## 2. Normative Language

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

- **MUST / MUST NOT**: required for conformance.
- **SHOULD / SHOULD NOT**: recommended unless a documented technical reason justifies deviation.
- **MAY**: optional.

## 3. System Goals

The system MUST support the following capabilities:

1. Accept structured and natural-language DeFi intents containing yield, risk, drawdown, impermanent-loss, delta, chain, protocol, slippage, and health-factor constraints.
2. Convert accepted intents into canonical machine-readable constraints.
3. Support privacy-preserving proof of selected intent and collateral conditions using Noir circuits and Barretenberg proofs.
4. Evaluate multiple execution routes across Ethereum Sepolia, Arbitrum Sepolia, and Base Sepolia.
5. Integrate Aave V3 for lending primitives.
6. Integrate Uniswap v4 for swaps and concentrated-liquidity positions.
7. Use LayerZero V2 for cross-chain application messaging.
8. Use Chainlink Data Feeds for protocol price inputs and Chainlink Automation or an equivalent keeper for eligible automated actions.
9. Maintain target delta exposure within a configured tolerance rather than assuming perfect continuous neutrality.
10. Predict liquidation risk and systemic liquidation cascades using off-chain AI/ML models.
11. Rank recovery actions using cost, risk, slippage, gas, liquidity, and post-action health constraints.
12. Enforce all capital-moving actions through deterministic smart-contract constraints.
13. Maintain an emergency unwind path for supported same-chain positions.
14. Maintain an auditable execution history without treating off-chain application state as the source of financial truth.

## 4. Non-Goals

The initial implementation does not attempt to provide:

- production-grade anonymity of the initial funding transaction;
- atomic execution across independent blockchains;
- a guarantee of zero impermanent loss;
- a guarantee of exact delta neutrality at all times;
- production insurance underwriting without a funded reserve and explicit coverage model;
- unrestricted support for arbitrary EVM networks or arbitrary DeFi protocols;
- custody of user funds in Convex, the frontend, or the AI service;
- direct LLM authority over asset movement;
- a replacement lending market for Aave;
- a replacement AMM core for Uniswap;
- mainnet deployment before independent security review.

## 5. Terminology

| Term | Definition |
|---|---|
| Intent | A set of desired financial outcomes and constraints rather than a preselected transaction path. |
| Solver | An off-chain process that constructs and scores candidate execution routes satisfying an intent. |
| Strategy | A concrete sequence of protocol actions selected to satisfy an intent. |
| Position | The logical portfolio state created by an executed strategy across one or more chains. |
| Health Factor (HF) | Lending safety metric derived from collateral, liquidation thresholds, and debt. |
| Delta | Approximate first-order directional exposure of the managed position to an underlying asset. |
| Delta tolerance | Maximum permitted absolute deviation from the target delta before rebalancing becomes eligible. |
| Recovery action | A bounded action intended to restore health, delta, drawdown, or protocol-risk constraints. |
| Commitment | Cryptographic commitment to private data used by the ZK subsystem. |
| Nullifier | Value preventing reuse of a private note or authorization proof. |
| Coordination chain | Chain on which the canonical intent/settlement coordination contracts are deployed. |
| Execution chain | Chain on which lending, swaps, LP, hedge, or recovery actions are performed. |

## 6. High-Level Architecture

```text
                         +-------------------+
                         |     apps/web      |
                         | Vite + React + TS |
                         +---------+---------+
                                   |
                  +----------------+----------------+
                  |                                 |
                  v                                 v
        +-------------------+             +-------------------+
        |   apps/backend    |             |   Wallet / RPC    |
        |      Convex       |             | wagmi + viem      |
        +---------+---------+             +---------+---------+
                  |                                 |
          +-------+-------+                         |
          |               |                         |
          v               v                         v
 +----------------+  +----------------+    +-------------------+
 |    apps/ai     |  |   apps/web3    |    | On-chain contracts|
 | FastAPI + ML   |  | solver/keeper  |--->| EVM testnets      |
 +----------------+  +-------+--------+    +---------+---------+
                            |                         |
                            +-------------+-----------+
                                          |
                                          v
                         +----------------------------------+
                         | External DeFi / infrastructure   |
                         | Aave V3 / Uniswap v4 / LayerZero |
                         | Chainlink Data Feeds / Automation|
                         +----------------------------------+
```

### 6.1 State Ownership

| State | Authoritative owner |
|---|---|
| Token balances | EVM contracts / token contracts |
| Deposits | Vault contract |
| Lending collateral and debt | Aave V3 and protocol position contracts |
| LP position state | Uniswap v4 and protocol position contracts |
| Hedge state | HedgeManager plus underlying protocol state |
| Intent acceptance and settlement | IntentManager / SolverSettlement |
| Cross-chain message state | LayerZero OApp contracts and local execution contracts |
| ZK nullifier consumption | ZK verifier / vault contract state |
| User application profile | Convex |
| Indexed position projection | Convex |
| Solver bid metadata | Convex and/or on-chain commitment state |
| AI predictions | Convex cache; apps/ai is computational source |
| Notifications | Convex |
| Financial execution authority | Smart contracts only |

Convex MUST NOT be treated as the authoritative ledger for assets, debt, LP ownership, or settlement.

## 7. Repository Architecture

```text
apps/
├── web/
├── backend/
├── ai/
└── web3/

packages/
├── ui/
├── sdk/
├── abi/
├── protocol/
├── types/
├── validation/
├── config/
├── logger/
├── eslint-config/
└── typescript-config/

infra/
├── docker/
├── deployments/
├── monitoring/
└── scripts/

docs/
├── architecture/
├── product/
├── protocol/
├── security/
├── ai/
└── api/

scripts/
tests/
.github/
```

### 7.1 `apps/web`

```text
apps/web/
├── public/
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── query-client.ts
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── intents/
│   │   ├── positions/
│   │   ├── strategies/
│   │   ├── solver-market/
│   │   ├── risk/
│   │   ├── simulator/
│   │   ├── activity/
│   │   └── settings/
│   ├── features/
│   │   ├── wallet/
│   │   ├── intents/
│   │   ├── positions/
│   │   ├── lending/
│   │   ├── liquidity/
│   │   ├── hedging/
│   │   ├── solvers/
│   │   ├── cross-chain/
│   │   ├── risk/
│   │   ├── automation/
│   │   └── zk/
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   ├── lib/
│   ├── types/
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

`apps/web` MUST be a Vite-based React TypeScript application. Wallet interaction MUST use user-controlled signing for user-initiated transactions.

### 7.2 `apps/backend`

```text
apps/backend/
├── convex/
│   ├── _generated/
│   ├── schema.ts
│   ├── users/
│   ├── wallets/
│   ├── intents/
│   ├── positions/
│   ├── strategies/
│   ├── solvers/
│   │   ├── registry.ts
│   │   ├── bids.ts
│   │   ├── auction.ts
│   │   └── results.ts
│   ├── executions/
│   ├── analytics/
│   ├── notifications/
│   ├── indexing/
│   │   ├── positions.ts
│   │   ├── transactions.ts
│   │   └── events.ts
│   ├── ai/
│   │   └── client.ts
│   ├── web3/
│   │   └── client.ts
│   ├── crons.ts
│   └── http.ts
├── package.json
└── tsconfig.json
```

`apps/backend` MUST remain a Convex application. It owns application metadata, indexing, realtime state, coordination, notifications, and persistence of AI outputs. It MUST NOT contain smart-contract source code or private keys with unrestricted user-fund authority.

### 7.3 `apps/ai`

```text
apps/ai/
├── src/
│   ├── api/
│   │   ├── liquidation.py
│   │   ├── recovery.py
│   │   ├── threshold.py
│   │   ├── personalization.py
│   │   ├── regime.py
│   │   ├── liquidity.py
│   │   ├── cascade.py
│   │   ├── stress.py
│   │   ├── explain.py
│   │   └── intent.py
│   ├── models/
│   │   ├── liquidation/
│   │   ├── volatility/
│   │   ├── market_regime/
│   │   ├── cascade/
│   │   ├── strategy_ranking/
│   │   ├── hedge_optimizer/
│   │   └── yield_risk/
│   ├── features/
│   ├── inference/
│   ├── optimization/
│   │   ├── recovery.py
│   │   ├── hedge.py
│   │   ├── allocation.py
│   │   └── routing.py
│   ├── simulation/
│   ├── llm/
│   │   ├── intent_parser.py
│   │   ├── explanations.py
│   │   └── scenario_parser.py
│   ├── schemas/
│   ├── services/
│   └── main.py
├── training/
│   ├── datasets/
│   ├── experiments/
│   ├── pipelines/
│   └── train.py
├── artifacts/
│   └── models/
├── tests/
├── Dockerfile
├── pyproject.toml
└── README.md
```

### 7.4 `apps/web3`

`apps/web3` is the complete blockchain execution workspace. Solver and keeper are runtime processes inside this workspace, not top-level applications.

```text
apps/web3/
├── contracts/
│   ├── core/
│   │   ├── Vault.sol
│   │   ├── IntentManager.sol
│   │   ├── PositionManager.sol
│   │   └── StrategyExecutor.sol
│   ├── solver/
│   │   ├── SolverRegistry.sol
│   │   ├── SolverSettlement.sol
│   │   └── IntentSettlement.sol
│   ├── risk/
│   │   ├── RiskController.sol
│   │   ├── RecoveryExecutor.sol
│   │   └── CircuitBreaker.sol
│   ├── defi/
│   │   ├── AaveV3Adapter.sol
│   │   ├── UniswapV4Adapter.sol
│   │   ├── LendingManager.sol
│   │   ├── LiquidityManager.sol
│   │   └── HedgeManager.sol
│   ├── crosschain/
│   │   ├── CrossChainRouter.sol
│   │   ├── LayerZeroAdapter.sol
│   │   └── RemoteExecutor.sol
│   ├── oracle/
│   │   ├── OracleAdapter.sol
│   │   └── ChainlinkOracle.sol
│   ├── automation/
│   │   ├── PositionAutomation.sol
│   │   ├── RebalanceAutomation.sol
│   │   └── EmergencyAutomation.sol
│   ├── zk/
│   │   ├── ZKIntentVerifier.sol
│   │   ├── ZKOwnershipVerifier.sol
│   │   └── ZKCollateralVerifier.sol
│   ├── insurance/
│   │   └── InsuranceReserve.sol
│   ├── interfaces/
│   ├── libraries/
│   └── mocks/
├── zk/
│   ├── circuits/
│   │   ├── ownership/
│   │   ├── intent/
│   │   └── collateral/
│   └── scripts/
├── adapters/
│   ├── aave/
│   ├── uniswap/
│   ├── layerzero/
│   └── chainlink/
├── solver/
│   ├── engine/
│   ├── routes/
│   ├── auction/
│   ├── simulation/
│   └── index.ts
├── keeper/
│   ├── monitors/
│   ├── triggers/
│   └── index.ts
├── chains/
│   ├── ethereum-sepolia.ts
│   ├── arbitrum-sepolia.ts
│   ├── base-sepolia.ts
│   └── optimism-sepolia.ts
├── deployments/
├── script/
├── test/
│   ├── unit/
│   ├── integration/
│   ├── invariant/
│   ├── fuzz/
│   ├── fork/
│   ├── zk/
│   └── cross-chain/
├── lib/
├── config/
├── foundry.toml
├── remappings.txt
├── package.json
├── tsconfig.json
└── README.md
```

### 7.5 Shared Packages

- `packages/ui`: reusable React components and charts.
- `packages/sdk`: TypeScript client for intents, positions, ZK proof submission, and contract interactions.
- `packages/abi`: generated and versioned contract ABIs.
- `packages/protocol`: pure deterministic TypeScript math shared across web, backend, AI validation, and test tooling.
- `packages/types`: shared TypeScript domain types.
- `packages/validation`: shared Zod schemas for application-level input validation.
- `packages/config`: chain IDs, feature flags, protocol configuration, public addresses.
- `packages/logger`: structured logging helpers.
- `packages/eslint-config`: shared lint configuration.
- `packages/typescript-config`: shared TypeScript configuration.

ZK circuits MUST remain under `apps/web3/zk`. Browser-facing proof helpers MAY be exposed from `packages/sdk/src/zk`.

## 8. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Wallet | wagmi, viem, RainbowKit |
| Backend | Convex |
| AI service | Python, FastAPI |
| ML | XGBoost and/or PyTorch depending on model requirements |
| Smart contracts | Solidity >=0.8.24 <0.9.0, exact compiler pinned per deployment |
| Contract framework | Foundry |
| Contract libraries | OpenZeppelin |
| Coordination chain | Ethereum Sepolia |
| Execution chains | Arbitrum Sepolia, Base Sepolia |
| Optional chain | Optimism Sepolia |
| Lending | Aave V3 |
| AMM / LP | Uniswap v4 |
| Cross-chain messaging | LayerZero V2 OApp |
| Oracle | Chainlink Data Feeds |
| Automation | Chainlink Automation and/or custom keeper |
| ZK | Noir + Barretenberg |
| Solver runtime | TypeScript + Bun |
| Local EVM | Anvil |
| Contract simulation | Foundry fork tests; optional Tenderly tooling |

## 9. Functional Requirements

### FR-001 Wallet Connection

The frontend MUST support EVM wallet connection and chain switching for every enabled chain.

### FR-002 User-Controlled Signing

User-originated deposits, approvals, withdrawals, and intent authorizations MUST require the user's wallet signature unless an explicitly scoped smart-account permission model is introduced later.

### FR-003 Intent Creation

The system MUST accept at least the following intent fields:

```yaml
objective:
  target_apy_min: decimal | null
  target_apy_max: decimal | null
risk:
  max_drawdown_pct: decimal
  max_impermanent_loss_pct: decimal | null
  max_liquidation_probability: decimal | null
  min_health_factor: decimal | null
  max_slippage_bps: integer
exposure:
  target_delta: decimal
  delta_tolerance: decimal
chains:
  allow: [chain_id]
protocols:
  allow: [protocol_id]
automation:
  rebalance_enabled: boolean
  recovery_enabled: boolean
  emergency_unwind_enabled: boolean
privacy:
  hide_strategy_parameters: boolean
  require_zk_ownership_proof: boolean
```

### FR-004 Intent Validation

The backend MUST validate application-level syntax. Smart contracts MUST independently validate execution-critical constraints.

### FR-005 Natural-Language Intent Parsing

`apps/ai` MAY convert natural-language requests into the canonical intent schema. The generated intent MUST be displayed to the user and explicitly approved before authorization.

### FR-006 Private Intent Commitment

When privacy is enabled, the client MUST create a commitment to the normalized intent. Only the minimum public fields needed for verification and routing SHOULD be exposed.

### FR-007 Ownership Proof

The ZK subsystem MUST support proof of control over an eligible private commitment or note without exposing the secret witness.

### FR-008 Solver Candidate Generation

The solver MUST produce multiple candidate routes whenever at least two valid strategies exist.

### FR-009 Solver Scoring

Candidate scoring MUST include at least:

- expected net APY;
- execution cost;
- estimated gas;
- expected slippage;
- liquidity depth;
- expected drawdown;
- estimated liquidation probability;
- expected impermanent loss where applicable;
- bridge/cross-chain cost;
- protocol allowlist compliance;
- delta after execution.

### FR-010 Solver Auction

The system SHOULD use a sealed-bid commit/reveal mechanism for solver competition. If a time-decaying solver reward is used, it MAY introduce Dutch-auction-like reward decay, but the protocol MUST NOT describe a conventional sealed-bid auction as a Dutch auction unless the pricing rule actually implements descending-price allocation.

### FR-011 MEV Reduction

The system SHOULD reduce strategy leakage using some combination of commitment schemes, delayed reveal, private order flow where available, batching, and bounded execution windows.

The system MUST NOT claim MEV elimination.

### FR-012 Lending

The Aave adapter MUST support the subset required by the selected strategy:

- supply;
- borrow;
- repay;
- withdraw;
- health-factor reads;
- flash-loan operations where used.

### FR-013 Concentrated Liquidity

The Uniswap adapter MUST support:

- pool identification;
- quote/swap operations;
- liquidity addition;
- liquidity removal;
- position valuation;
- in-range/out-of-range detection;
- fee estimation or retrieval sufficient for strategy scoring.

### FR-014 Uniswap v4 Hooks

A custom v4 hook MAY be used for dynamic fee or risk-aware pool behavior. Hook logic MUST have bounded parameter changes and dedicated invariant/adversarial tests.

### FR-015 Cross-Chain Messaging

LayerZero V2 OApp contracts MUST be used for cross-chain control messages. Cross-chain messages MUST include a replay-safe identifier and destination intent/position context.

### FR-016 Cross-Chain Assets

LayerZero messaging alone MUST NOT be treated as arbitrary token bridging. Asset movement MUST use a supported OFT/canonical bridge or a prefunded destination execution model explicitly documented for the asset.

### FR-017 Unified Position View

The application MUST expose a logical position aggregating per-chain components while retaining chain-level decomposition.

### FR-018 Delta Calculation

The protocol MUST calculate approximate net delta for managed assets using deterministic position data and approved pricing inputs.

### FR-019 Delta Rebalancing

A rebalance becomes eligible when:

```text
abs(current_delta - target_delta) > delta_tolerance
```

Execution MUST still pass slippage, health, capital-movement, and protocol constraints.

### FR-020 Liquidation Probability

`apps/ai` MUST provide liquidation probability estimates for configured horizons, at minimum a short, medium, and longer horizon suitable for the demo environment.

### FR-021 Recovery Strategy Ranking

`apps/ai` MUST rank eligible recovery strategies such as:

- partial debt repayment;
- collateral deleveraging;
- collateral swap;
- hedge adjustment;
- reserve repayment;
- combined strategy.

### FR-022 Dynamic Risk Threshold

`apps/ai` SHOULD recommend a dynamic intervention threshold based on market regime and position state. Smart contracts MUST bound the accepted threshold to administrator/user-approved minimum and maximum values.

### FR-023 Personalized Risk Policy

The system MAY use explicit user preferences and historical accepted/rejected recommendations to personalize risk policy. Personalization MUST NOT override hard user limits.

### FR-024 Market Regime Detection

`apps/ai` SHOULD classify conditions into a finite set such as stable, trending, high-volatility, liquidity-stress, flash-crash, and recovery regimes.

### FR-025 Liquidity-Aware Execution

The solver and AI service SHOULD estimate liquidity, price impact, gas, and expected slippage before choosing an execution venue or route.

### FR-026 Cascade Liquidation Prediction

`apps/ai` SHOULD estimate protocol-level forced selling and secondary liquidation risk under specified price shocks.

### FR-027 Stress Scenario Generation

The AI/simulation layer MUST support deterministic parameterized stress tests. Generative scenario creation MAY be added, but generated scenarios MUST be converted into explicit numerical parameters before simulation.

### FR-028 Explainable Risk

Each risk score or recovery recommendation MUST expose its principal input factors and the deterministic constraints that caused an action to become eligible.

### FR-029 Natural-Language Analysis

An LLM MAY explain simulated outcomes. It MUST consume outputs from deterministic calculations and model services rather than inventing balances, health factors, or execution results.

### FR-030 Emergency Circuit Breaker

The protocol MUST support an emergency state that prevents new risky operations and enables approved unwind actions.

### FR-031 Same-Chain Flash Unwind

Where a complete recovery sequence can be executed on one chain, the protocol MAY use flash liquidity to perform an atomic unwind.

### FR-032 Cross-Chain Recovery

Cross-chain recovery MUST be modeled as a state machine with asynchronous confirmations. It MUST NOT be represented as a single atomic transaction.

### FR-033 Parametric Insurance

If enabled, insurance payouts MUST be tied to explicit, objectively verifiable trigger conditions and a funded reserve. AI predictions alone MUST NOT constitute a payout trigger.

## 10. Non-Functional Requirements

### NFR-001 Safety

No AI or LLM component may possess unrestricted authority to move user funds.

### NFR-002 Determinism

Every capital-moving action MUST be reproducible from explicit transaction parameters and deterministic on-chain validation.

### NFR-003 Observability

Every accepted intent, solver result, settlement, cross-chain message, recovery action, and emergency event MUST have a unique trace identifier.

### NFR-004 Idempotency

Backend ingestion and cross-chain processing MUST tolerate duplicate events without duplicating financial actions.

### NFR-005 Replay Protection

Intent authorization, solver settlement, cross-chain actions, and ZK nullifiers MUST have explicit replay protection.

### NFR-006 Fail Closed

If oracle data is unavailable, stale, invalid, or outside configured deviation bounds, risk-increasing actions MUST fail closed.

### NFR-007 Bounded Automation

Automated actions MUST obey maximum collateral sale, maximum debt repayment, maximum slippage, approved protocol, approved chain, and minimum resulting health-factor constraints.

### NFR-008 Precision

Financial arithmetic MUST use integer/fixed-point representations. Floating-point values MUST NOT be used in Solidity financial calculations.

### NFR-009 Compatibility

Public TypeScript packages MUST not depend on Convex internals.

### NFR-010 Testability

Critical protocol functions MUST be testable under local forked EVM state.

## 11. Intent Model

### 11.1 Canonical Intent

```ts
interface Intent {
  version: number;
  ownerCommitment: `0x${string}`;
  nonce: bigint;
  expiresAt: bigint;
  objective: {
    targetApyMin?: number;
    targetApyMax?: number;
  };
  risk: {
    maxDrawdownPct: number;
    maxImpermanentLossPct?: number;
    maxLiquidationProbability?: number;
    minHealthFactor?: number;
    maxSlippageBps: number;
    maxCapitalMovePct: number;
  };
  exposure: {
    targetDelta: number;
    deltaTolerance: number;
  };
  chains: number[];
  protocols: string[];
  automation: {
    rebalance: boolean;
    recovery: boolean;
    emergencyUnwind: boolean;
  };
  privacy: {
    privateParameters: boolean;
    zkOwnershipRequired: boolean;
  };
}
```

The TypeScript representation is an application type. Solidity MUST use fixed-width integer encodings and hashes suitable for ABI encoding.

### 11.2 Intent Commitment

The normalized intent MUST be deterministically serialized before hashing. The serialization version MUST be included in the commitment domain.

A conceptual commitment is:

```text
intent_commitment = H(
  domain,
  version,
  normalized_private_intent,
  user_secret,
  nonce
)
```

The exact hash used inside Noir SHOULD be ZK-efficient and MUST match the on-chain verifier expectations.

## 12. ZK Privacy Architecture

### 12.1 Privacy Scope

The first implementation MUST distinguish among:

1. **Intent-parameter privacy**: selected strategy constraints remain private while a proof establishes validity.
2. **Private note ownership**: a user proves control of a vault commitment without revealing the witness secret.
3. **Funding-source privacy**: the origin of the deposit transaction is hidden.
4. **Execution-path privacy**: the complete strategy route is not publicly observable.

MVP MUST implement (1) and MAY implement (2). It MUST NOT claim (3) or (4) unless the corresponding transaction flows are actually privacy-preserving.

A normal EVM deposit transaction remains public and can link the depositing wallet to the vault interaction.

### 12.2 Circuits

#### Ownership Circuit

Private witnesses MAY include:

- secret;
- nullifier secret;
- commitment opening values;
- Merkle path.

Public inputs MAY include:

- current Merkle root;
- nullifier hash;
- eligibility output;
- domain separator.

#### Intent Circuit

The circuit SHOULD prove statements such as:

```text
target_apy_min within permitted range
max_drawdown <= configured upper bound
max_slippage <= configured upper bound
allowed chain set is non-empty
intent not expired
commitment matches normalized intent
```

#### Collateral Circuit

If amount privacy is implemented, the circuit MAY prove:

```text
private_collateral_value >= required_minimum
```

without revealing the exact private value.

### 12.3 Proving

Proof generation SHOULD occur client-side when feasible so private witnesses need not be sent to Convex or `apps/ai`.

### 12.4 Verification

Generated verifier contracts MUST be versioned. A circuit change MUST produce a new verifier version and domain identifier.

## 13. Solver Architecture

### 13.1 Solver Inputs

Each solver evaluates:

- allowed chains;
- allowed protocols;
- current Aave supply/borrow rates;
- Uniswap pool state and liquidity;
- estimated LP fees;
- bridge or OFT fees where applicable;
- gas estimates;
- Chainlink prices;
- health factor;
- current and projected delta;
- AI risk outputs;
- user constraints.

### 13.2 Candidate Route

```ts
interface SolverRoute {
  routeId: string;
  solverId: string;
  intentId: string;
  actions: RouteAction[];
  expectedNetApy: number;
  expectedDrawdownPct: number;
  expectedImpermanentLossPct?: number;
  liquidationProbability: number;
  estimatedGasUsd: number;
  estimatedSlippageBps: number;
  resultingDelta: number;
  resultingHealthFactor?: number;
  validityDeadline: number;
}
```

### 13.3 Auction

The preferred design is:

```text
Intent opened
   |
   v
Commit phase
   |  solver commits H(route, quote, salt)
   v
Reveal phase
   |  solver reveals route + quote + salt
   v
Constraint validation
   |
   v
Score valid bids
   |
   v
Select winner
   |
   v
Settlement authorization
```

The scoring function MUST be deterministic for a given set of bid fields and risk inputs used for final selection.

### 13.4 Solver Bonding

A future production version SHOULD require solver collateral or reputation to discourage invalid/failing fills. The testnet implementation MAY omit economic slashing.

## 14. MEV Protection Model

The protocol uses layered mitigation rather than claiming complete MEV prevention.

Required or recommended controls:

- intent commitments before route disclosure;
- sealed solver bids;
- reveal windows;
- short settlement deadlines;
- minimum-output and maximum-slippage bounds;
- optional transaction batching;
- optional private relay/order-flow submission;
- route details withheld until required for settlement;
- on-chain verification of solver-provided minimum outputs.

Batch settlement SHOULD execute logically compatible orders together when this reduces information leakage or price impact.

## 15. Lending Integration

### 15.1 Aave V3 Adapter

`AaveV3Adapter.sol` provides a narrow protocol interface to Aave V3.

Required methods SHOULD cover:

```text
supply(asset, amount, onBehalfOf)
borrow(asset, amount, rateMode, onBehalfOf)
repay(asset, amount, rateMode, onBehalfOf)
withdraw(asset, amount, to)
getUserAccountData(user)
flashLoan / flashLoanSimple when required
```

The adapter MUST NOT duplicate Aave accounting.

### 15.2 Health Factor

The system MUST treat Aave-provided account state as authoritative for Aave positions. Locally computed projections are simulations only.

A health factor below the protocol-defined liquidation boundary means the position may be liquidatable. Recovery SHOULD be initiated before reaching that boundary when user policy allows it.

## 16. AMM and Liquidity Integration

### 16.1 Uniswap v4

The system uses Uniswap v4 for supported swaps and concentrated-liquidity strategies.

The integration MAY use v4 hooks for:

- dynamic fee policies;
- liquidity-management signals;
- custom accounting required by a specific strategy;
- risk-aware pool behavior.

### 16.2 Hook Safety

Autonomous hook parameters MUST have:

- hard minimum/maximum values;
- bounded rate of change;
- time/state gating;
- reentrancy protections;
- explicit role controls;
- event emission for parameter changes;
- fuzz and invariant tests.

### 16.3 Concentrated Liquidity State

The system MUST track:

- token pair;
- pool key;
- tick range;
- current tick;
- liquidity amount;
- token amounts;
- fee accrual estimate;
- in-range status;
- estimated IL;
- delta contribution.

## 17. Delta-Neutral Hedging

### 17.1 Target

Delta neutrality is represented as a target:

```text
target_delta = 0
abs(net_delta) <= delta_tolerance
```

The system MUST NOT promise exact neutrality between blocks or during cross-chain transitions.

### 17.2 Lending-Based Short

An MVP hedge MAY use Aave plus Uniswap:

```text
collateral deposited
       |
       v
borrow WETH
       |
       v
swap WETH -> stable asset
       |
       v
negative ETH exposure offsets LP delta
```

### 17.3 Rebalance Trigger

Rebalancing SHOULD consider:

- delta drift;
- hedge transaction cost;
- gas;
- slippage;
- current liquidity;
- volatility regime;
- health-factor impact;
- minimum time since previous rebalance.

The protocol SHOULD prevent excessive churn using hysteresis and cooldown periods.

## 18. Cross-Chain Architecture

### 18.1 LayerZero V2

`CrossChainRouter.sol` and `LayerZeroAdapter.sol` implement the LayerZero V2 OApp messaging path.

Messages MUST encode:

```text
messageVersion
sourceChain
sourceContract
intentId / positionId
actionType
payloadHash
nonce
expiry
```

### 18.2 Remote Executor

Each execution chain has a `RemoteExecutor` authorized to process valid messages from configured peers.

`RemoteExecutor` MUST verify:

- the LayerZero endpoint caller;
- configured source peer;
- message version;
- nonce/replay state;
- action expiry;
- local protocol allowlist;
- local risk constraints.

### 18.3 State Machine

Cross-chain strategy execution MUST use explicit states, for example:

```text
CREATED
  -> SOURCE_LOCKED
  -> MESSAGE_SENT
  -> DESTINATION_RECEIVED
  -> DESTINATION_EXECUTED
  -> ACK_SENT
  -> CONFIRMED

Failure branches:
  -> EXPIRED
  -> FAILED
  -> RECOVERY_REQUIRED
```

A timeout MUST NOT silently imply rollback on another chain.

## 19. Oracle Architecture

### 19.1 Chainlink Data Feeds

Price-sensitive operations MUST use approved oracle feeds where available.

The adapter MUST verify:

- positive price;
- expected decimals;
- update timestamp freshness;
- configured maximum age;
- optional deviation against a secondary observation when required.

### 19.2 Fail-Closed Behavior

If the oracle is stale or invalid:

- opening additional leverage MUST be disabled;
- automated risk-increasing strategies MUST be disabled;
- emergency risk-reducing operations MAY remain available if they can execute safely under configured fallback rules.

## 20. Automation and Keeper

The keeper runtime resides in `apps/web3/keeper`.

### 20.1 Monitoring

It monitors:

- health factor;
- net delta;
- LP range;
- volatility regime;
- stablecoin peg deviation;
- cross-chain message timeout;
- risk score;
- protocol allowlist status.

### 20.2 Triggering

The keeper MAY submit transactions for actions preauthorized by users and permitted by contracts.

Keeper failure MUST NOT make unauthorized fund movement possible. It may delay protection but cannot bypass contract constraints.

### 20.3 Chainlink Automation

Where used, Chainlink Automation SHOULD trigger deterministic contract checks and execution. Off-chain AI outputs MAY inform stored bounded parameters but MUST NOT substitute for on-chain eligibility checks.

## 21. AI/ML System

`apps/ai` is advisory and analytical. It does not own keys or financial state.

### 21.1 Predictive Liquidation Risk

Inputs MAY include:

- current health factor;
- HF trend;
- collateral composition;
- collateral volatility;
- debt composition;
- price velocity;
- realized/implied volatility proxies;
- DEX liquidity;
- lending utilization;
- oracle price movement;
- stablecoin deviations;
- gas conditions.

Output example:

```json
{
  "horizons": {
    "5m": 0.08,
    "30m": 0.31,
    "2h": 0.67
  },
  "modelVersion": "liq-0.1.0",
  "confidence": 0.76
}
```

Predictions MUST include model version and timestamp.

### 21.2 Recovery Strategy Selector

The optimizer evaluates candidate actions using an objective such as:

```text
minimize:
  expected_loss
+ slippage_cost
+ gas_cost
+ execution_cost
+ future_liquidation_penalty
+ delta_deviation_penalty

subject to:
  resulting_health_factor >= required_health_factor
  collateral_sold <= user_max_collateral_sale
  repayment <= user_max_repayment
  slippage <= user_max_slippage
  protocol in allowlist
  chain in allowlist
```

The final on-chain transaction MUST independently enforce the constraints.

### 21.3 Dynamic Intervention Thresholds

The AI service MAY recommend a target intervention threshold based on regime and position risk.

Example:

```text
stable regime        -> HF trigger 1.10
high volatility      -> HF trigger 1.18
liquidity stress     -> HF trigger 1.25
```

These values are examples, not protocol constants. Production thresholds require calibration and validation.

### 21.4 Personalized Risk Model

Personalization MUST use explicit user configuration as the primary control. Learned preferences MAY adjust recommendations inside the user's permitted envelope.

### 21.5 Market Regime Detection

Supported labels SHOULD include:

- stable;
- trending;
- high_volatility;
- liquidity_stress;
- flash_crash;
- recovery.

The model SHOULD expose probability distribution rather than only a hard class where practical.

### 21.6 Liquidity-Aware Execution

The AI/solver pipeline SHOULD estimate:

- expected price impact;
- pool depth;
- slippage distribution;
- gas;
- route failure probability;
- opportunity decay.

### 21.7 Cascade Liquidation Predictor

The simulator SHOULD model:

```text
price shock
 -> positions cross thresholds
 -> forced selling volume
 -> available market depth consumed
 -> secondary price impact
 -> additional positions become liquidatable
```

Outputs SHOULD include projected forced-selling notional, secondary liquidation exposure, and affected position counts for each scenario.

### 21.8 Stress Scenario Generator

The simulation API MUST accept explicit deterministic scenarios:

```json
{
  "ethPriceShockPct": -14,
  "stablecoinDepegPct": -3,
  "dexLiquidityShockPct": -35,
  "gasMultiplier": 4
}
```

An LLM MAY translate user prose into this schema but MUST NOT directly modify financial state.

### 21.9 Explainable Risk

Explanations MUST distinguish:

- observed data;
- model prediction;
- deterministic protocol calculation;
- simulated assumption.

Example:

```text
Risk level: HIGH
Observed: ETH realized volatility increased 2.8x.
Observed: Available route liquidity decreased 31%.
Calculated: Health factor is 1.12.
Predicted: 30-minute liquidation probability is 0.41.
```

### 21.10 Natural-Language Position Analysis

The LLM layer may answer questions such as:

```text
What happens if ETH falls 12%?
```

The response MUST be generated from a numerical scenario simulation. The model MUST NOT invent transaction values absent from the simulator result.

### 21.11 Model Risk

Every model MUST have:

- version identifier;
- feature schema version;
- training-data time range;
- evaluation report;
- calibration metrics where probabilistic outputs are used;
- fallback behavior;
- drift monitoring plan.

AI failure MUST degrade to deterministic protocol safety rules, not disable them.

## 22. Risk Recovery and Emergency Unwind

### 22.1 Recovery Actions

Eligible recovery primitives include:

1. partial debt repayment;
2. partial collateral sale;
3. collateral swap;
4. hedge adjustment;
5. LP withdrawal/recentering;
6. combined same-chain action;
7. movement to a configured lower-risk vault state.

### 22.2 Recovery Authorization

Each user position MUST define limits for automated actions:

```text
max collateral sale percentage
max repayment amount
max slippage
minimum resulting health factor
allowed assets
allowed protocols
allowed chains
max gas budget or execution fee
```

### 22.3 Circuit Breaker

The circuit breaker MUST support at least:

```text
NORMAL
RESTRICTED
EMERGENCY
```

Example semantics:

- `NORMAL`: all configured actions allowed.
- `RESTRICTED`: risk-increasing actions disabled; repayments/withdrawals/recovery remain enabled where safe.
- `EMERGENCY`: only explicitly permitted recovery, unwind, and withdrawal paths enabled.

### 22.4 Flash Unwind

A same-chain flash unwind MAY perform:

```text
flash borrow
 -> repay debt
 -> release collateral
 -> remove LP
 -> close/rebalance hedge
 -> convert assets
 -> repay flash liquidity
 -> retain remaining assets in vault
```

All same-chain steps MUST revert together if the flash-loan settlement cannot complete.

## 23. Parametric Insurance

This module is optional and MUST remain separated from core risk recovery.

### 23.1 Trigger Requirements

Valid triggers MUST be objectively verifiable, for example:

- supported stablecoin price remains below configured threshold for configured duration;
- approved oracle divergence exceeds threshold;
- supported bridge/message path is unavailable for a defined period;
- protocol-specific verifiable condition is met.

### 23.2 Reserve

Claims cannot exceed funded reserve capacity under the selected coverage rules. The MVP MAY simulate payout accounting without production underwriting.

## 24. Convex Data Model

Suggested tables:

```text
users
wallets
intents
intentVersions
positions
positionComponents
strategies
solverRegistry
solverBidCommits
solverBidReveals
executions
chainTransactions
crossChainMessages
riskSnapshots
aiPredictions
alerts
notifications
protocolMetrics
indexerCursors
```

### 24.1 Indexed Position

An indexed position record SHOULD contain:

```ts
{
  positionId,
  ownerAddress,
  status,
  coordinationChainId,
  componentIds,
  latestBlockByChain,
  netValueUsd,
  netDelta,
  healthFactor,
  lastRiskSnapshotId,
  updatedAt
}
```

These values are cached projections and MUST be reconcilable with on-chain state.

### 24.2 Indexer Cursor

For each chain, Convex MUST persist the last finalized or accepted block processed so event ingestion can resume deterministically.

## 25. Application Interfaces

### 25.1 Web to Convex

Representative functions:

```text
intents.createDraft
intents.publish
intents.get
positions.list
positions.get
solvers.listBids
strategies.get
risk.getLatest
activity.list
notifications.list
```

### 25.2 Convex to AI

Representative internal calls:

```text
POST /v1/liquidation/predict
POST /v1/recovery/rank
POST /v1/regime/classify
POST /v1/cascade/simulate
POST /v1/stress/simulate
POST /v1/intent/parse
POST /v1/explain
```

All AI responses MUST include a schema version and model version.

### 25.3 Web/Backend to Web3 SDK

Representative SDK methods:

```text
createIntentCommitment()
generateIntentProof()
submitIntent()
quoteDeposit()
deposit()
readPosition()
readHealthFactor()
listSolverResults()
settleIntent()
requestWithdrawal()
simulateRecovery()
```

## 26. Security Model

### 26.1 Trust Boundaries

Trusted only within explicit limits:

- user wallet for user authorization;
- deployed smart contracts for financial rules;
- configured LayerZero peers for cross-chain messages;
- approved Chainlink feeds for configured oracle inputs.

Not trusted for unrestricted execution:

- Convex;
- AI service;
- solver node;
- keeper node;
- frontend;
- arbitrary RPC endpoint;
- arbitrary DEX quote source.

### 26.2 Smart-Contract Controls

Critical contracts MUST implement as appropriate:

- reentrancy protection;
- checks-effects-interactions discipline;
- role separation;
- pause/circuit-breaker controls;
- slippage bounds;
- deadlines;
- nonce/replay protection;
- protocol/asset/chain allowlists;
- maximum automated capital movement;
- oracle freshness checks;
- safe token-transfer helpers;
- explicit event emission.

### 26.3 Upgrade Policy

The MVP SHOULD avoid upgradeable proxies for core asset-holding logic unless upgradeability is required by the implementation. Prefer versioned redeployment and explicit migration for financial core contracts.

### 26.4 Key Management

Production user funds MUST NOT depend on a plaintext backend private key. Testnet automation keys MUST be isolated and limited to roles that cannot withdraw arbitrary user funds.

### 26.5 Solver Security

Solver output is untrusted until validated. Contracts MUST reject routes that violate:

- intent hash/authorization;
- deadline;
- minimum output;
- maximum slippage;
- chain/protocol allowlist;
- maximum capital movement;
- health-factor constraints.

### 26.6 Cross-Chain Security

Remote execution MUST authenticate the expected LayerZero peer and reject duplicate/expired messages.

## 27. Failure Modes

| Failure | Required behavior |
|---|---|
| AI service unavailable | Continue deterministic monitoring; no AI-dependent risk-increasing action. |
| Convex unavailable | On-chain funds remain accessible through contracts; frontend may enter degraded read mode using RPC. |
| Solver unavailable | Intent remains pending or user selects a deterministic fallback route if supported. |
| Keeper unavailable | No unauthorized action occurs; automation is delayed. |
| Oracle stale | Risk-increasing operations fail closed. |
| LayerZero delayed | Cross-chain state remains pending; timeout/recovery path becomes visible. |
| Destination execution fails | Record failure; do not mark strategy complete; initiate retry/recovery policy. |
| ZK proof invalid | Reject intent authorization/operation. |
| DEX slippage exceeds limit | Transaction reverts or route is abandoned. |
| HF below emergency level | Attempt eligible recovery; otherwise allow underlying liquidation mechanics. |
| Stablecoin depeg | Restrict exposure according to configured deterministic thresholds. |
| Model output out of schema/range | Reject model output and use fallback rules. |

## 28. Observability

Every major action MUST emit or record:

```text
traceId
intentId
positionId
chainId
transactionHash (when on-chain)
solverId (when applicable)
modelVersion (when applicable)
actionType
status
timestamp
failureCode
```

On-chain contracts SHOULD emit structured events for intent acceptance, settlement, recovery, rebalancing, circuit-breaker transitions, and cross-chain message processing.

## 29. Testing Strategy

### 29.1 Solidity Unit Tests

Test each contract and library in isolation.

### 29.2 Fuzz Tests

Fuzz:

- health-factor boundary values;
- slippage limits;
- amount scaling/decimals;
- solver settlement inputs;
- oracle values;
- replay/nonces;
- delta thresholds.

### 29.3 Invariant Tests

Minimum invariants:

1. No user may withdraw another user's vault entitlement.
2. Consumed nullifiers cannot be reused.
3. Automated actions cannot exceed user-defined maximum capital movement.
4. Solver settlement cannot bypass intent expiry.
5. Cross-chain messages cannot be executed twice.
6. Emergency mode cannot enable a broader permission set than normal mode.
7. Failed flash-loan recovery leaves no partially committed same-chain state.
8. Internal accounting never creates assets absent an external protocol/token transfer.

### 29.4 Fork Tests

Anvil/Foundry fork tests SHOULD exercise real protocol interfaces against supported chain state where RPC access permits.

### 29.5 Cross-Chain Tests

Test:

- valid message delivery;
- duplicate message;
- wrong peer;
- delayed acknowledgment;
- expired action;
- destination revert;
- out-of-order application-level message.

### 29.6 ZK Tests

For every circuit test:

- valid witness passes;
- modified public input fails;
- invalid Merkle path fails;
- consumed nullifier fails at contract layer;
- boundary constraint violations fail;
- circuit and Solidity verifier vectors match.

### 29.7 AI Tests

AI components require:

- train/validation/test split appropriate to time-series leakage constraints;
- calibration testing for probabilities;
- regime confusion matrix;
- recovery-ranking backtest/simulation;
- scenario sensitivity tests;
- out-of-distribution tests;
- deterministic fallback tests;
- schema contract tests against Convex.

### 29.8 End-to-End Tests

Required E2E flows:

1. create intent -> prove -> solver bids -> select -> execute;
2. open lending position -> price shock -> risk rises -> recovery -> health restored;
3. LP deployment -> delta drift -> hedge rebalance;
4. cross-chain instruction -> destination execution -> acknowledgment;
5. emergency trigger -> same-chain unwind;
6. stale oracle -> operation rejected;
7. AI unavailable -> deterministic safe degradation.

## 30. Acceptance Criteria

The testnet release is acceptable when all of the following are satisfied:

- frontend connects to Ethereum Sepolia, Arbitrum Sepolia, and Base Sepolia;
- user can create and approve an intent;
- at least one ZK intent or ownership circuit is proven and verified on-chain;
- solver produces at least two candidate strategies for a qualifying intent;
- winning strategy satisfies deterministic contract validation;
- Aave V3 integration opens/reads/manages a test lending position;
- Uniswap v4 integration performs a supported swap or liquidity operation;
- a target-delta calculation and rebalance simulation are demonstrated;
- LayerZero V2 sends and receives at least one application message between two supported testnets;
- Chainlink Data Feed prices are read with freshness validation;
- AI liquidation prediction is exposed with model version and explanation;
- AI recovery ranking produces bounded candidate actions;
- cascade/stress simulation runs from explicit numerical scenarios;
- emergency mode prevents at least one configured risk-increasing action;
- Foundry unit, fuzz, and invariant test suites pass;
- no component other than smart contracts can directly bypass user/protocol fund controls.

## 31. Deployment Model

### 31.1 Development

```text
apps/web      -> Vite dev server
apps/backend  -> Convex dev deployment
apps/ai       -> local FastAPI
apps/web3     -> Anvil + local solver/keeper processes
```

### 31.2 Testnet

```text
apps/web      -> static/serverless web host
apps/backend  -> Convex Cloud
apps/ai       -> container/web service
apps/web3     -> contracts on testnets
                 solver worker process
                 keeper worker process or Chainlink Automation
```

Although solver and keeper are separate runtime processes, they remain source-controlled under the single `apps/web3` workspace.

### 31.3 Docker

```text
infra/docker/
├── Dockerfile.ai
├── Dockerfile.web3-solver
├── Dockerfile.web3-keeper
└── docker-compose.yml
```

### 31.4 Contract Deployment Files

```text
apps/web3/deployments/
├── ethereum-sepolia.json
├── arbitrum-sepolia.json
├── base-sepolia.json
└── optimism-sepolia.json
```

Deployment records MUST include contract address, chain ID, deployment transaction, bytecode hash, compiler version, git commit, and timestamp.

## 32. CI/CD

Recommended workflows:

```text
.github/workflows/
├── ci.yml
├── web.yml
├── backend.yml
├── ai.yml
├── web3.yml
└── security.yml
```

Minimum CI checks:

- TypeScript lint/typecheck;
- frontend tests/build;
- Convex validation/build;
- Python lint/typecheck/tests;
- Foundry build;
- Solidity unit/fuzz/invariant tests;
- ABI generation consistency;
- ZK circuit compilation/tests;
- dependency/security scanning;
- secret scanning.

Contract deployment SHOULD require a separate manually approved workflow.

## 33. Configuration and Secrets

Public configuration belongs in `packages/config` or `apps/web3/config`:

```text
chain IDs
public RPC fallback list
contract addresses
oracle feed addresses
LayerZero endpoint IDs
supported assets
supported protocols
feature flags
```

Secrets MUST remain in deployment environment configuration:

```text
private RPC keys
AI service credentials
limited testnet automation key
private relay credentials
monitoring credentials
```

No production signing secret may be exposed to Vite client bundles.

## 34. Requirements Traceability Matrix

| Requirement group | Primary implementation | Primary tests |
|---|---|---|
| Intent creation/validation | web, backend, IntentManager | E2E intent flow, contract unit tests |
| ZK privacy | web3/zk, ZK verifiers, SDK | circuit tests, verifier integration |
| Solver marketplace | web3/solver, backend/solvers, SolverSettlement | auction unit/integration tests |
| Aave integration | AaveV3Adapter, LendingManager | fork/integration tests |
| Uniswap integration | UniswapV4Adapter, LiquidityManager | fork/integration/invariant tests |
| Delta hedging | HedgeManager, AI optimizer | simulation + contract tests |
| Cross-chain | LayerZeroAdapter, RemoteExecutor | cross-chain integration tests |
| Oracle | ChainlinkOracle | stale/deviation/positive-value tests |
| Automation | web3/keeper, automation contracts | keeper integration + authorization tests |
| Liquidation risk | apps/ai | offline evaluation + API contract tests |
| Recovery ranking | apps/ai + RecoveryExecutor | simulation + contract guardrail tests |
| Cascade prediction | apps/ai | scenario/backtest tests |
| Emergency unwind | CircuitBreaker, RecoveryExecutor | fork + atomicity tests |
| Convex projections | backend/indexing | replay/idempotency tests |

## 35. Implementation Phases

### Phase 0 - Repository and Interfaces

- initialize monorepo;
- establish shared packages;
- add chain configuration;
- define domain types and ABIs;
- configure Foundry, Convex, Vite, FastAPI.

### Phase 1 - Deterministic DeFi Core

- Vault;
- IntentManager;
- Aave V3 adapter;
- Uniswap v4 adapter;
- health-factor reads;
- deterministic position simulation;
- frontend wallet flows.

### Phase 2 - Solver and Settlement

- route builder;
- multiple solver candidates;
- commit/reveal auction;
- scoring;
- settlement validation.

### Phase 3 - AI Risk Layer

- liquidation probability;
- market regime;
- recovery ranking;
- explainability;
- stress simulator;
- cascade simulator.

### Phase 4 - Hedging and Automation

- delta calculation;
- Aave-based hedge strategy;
- rebalance policy;
- keeper;
- bounded automated recovery.

### Phase 5 - Cross-Chain

- LayerZero OApp;
- remote executor;
- asynchronous state machine;
- Base/Arbitrum test execution.

### Phase 6 - ZK

- intent circuit;
- ownership circuit;
- client proof generation;
- Solidity verifier integration;
- nullifier/replay rules.

### Phase 7 - Emergency and Optional Modules

- circuit breaker;
- flash unwind;
- optional insurance reserve;
- hardened monitoring and failure handling.

## 36. Open Design Decisions

The following decisions should remain explicit until implementation validates them:

1. Whether the MVP vault uses public deposit amounts with private intent parameters or implements private note amounts.
2. Which exact Uniswap v4 pool/hook configuration is used on each testnet.
3. Whether the initial delta hedge uses Aave-based shorting only or an additional derivatives protocol.
4. Whether testnet asset movement uses OFT, canonical bridges, or prefunded remote vaults.
5. Solver score weights and whether they are static, user-derived, or risk-regime-dependent.
6. Minimum safe frequency for automated rebalancing.
7. Whether Chainlink Automation or the custom keeper is the primary testnet trigger mechanism.
8. Which secondary oracle or TWAP is used for deviation checks, if any.
9. Whether circuit-breaker roles are immutable, multisig-controlled, or governance-controlled in later versions.
10. Whether insurance remains simulation-only or receives a funded testnet reserve.

## 37. Technical Constraints and Accuracy Requirements

The implementation and documentation MUST preserve the following distinctions:

- **Privacy-preserving intent** does not automatically imply anonymous funding.
- **Target delta-neutral** does not imply continuously zero delta.
- **Cross-chain coordinated execution** does not imply atomic rollback across chains.
- **MEV mitigation** does not imply elimination of MEV.
- **AI-selected strategy** does not imply AI is authorized to bypass deterministic controls.
- **Predicted liquidation probability** is a model estimate, not a protocol guarantee.
- **Parametric insurance** requires explicit funded coverage and deterministic triggers.
- **Convex position state** is an indexed projection, not the financial ledger.
- **LayerZero OApp messaging** is not by itself arbitrary token bridging.

## 38. Reference Basis

The specification structure follows common software design-document practice: explicit scope, architecture, data/interface design, component responsibilities, assumptions, failure modes, security, testing, deployment, and traceability.

Implementation decisions are based on the current official documentation for:

- Foundry and Anvil for Solidity build, fuzz/invariant testing, deployment, and EVM forking;
- Aave V3 health factor, borrowing, repayment, and liquidation semantics;
- Uniswap v4 hooks, concentrated liquidity, and dynamic fees;
- LayerZero V2 OApp messaging and peer configuration;
- Chainlink Data Feeds and Automation;
- Noir and Barretenberg proving/verification workflows;
- Convex HTTP actions, actions, and cron scheduling.

Protocol addresses, chain support, oracle feed addresses, endpoint IDs, and external API details MUST be pulled from current official deployment/configuration sources at implementation time rather than copied permanently into this document.
