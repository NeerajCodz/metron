# Backend release evidence

This record covers the AI, Convex, Web3, SDK, operations, and observability work. UI files are outside this scope and were left unchanged.

## Passing checks

The following checks passed on the current tree:

- `pnpm format:check`
- `pnpm turbo run lint --filter='!@metron/ui'`
- `pnpm turbo run typecheck --filter='!@metron/ui'`
- `pnpm turbo run test --filter='!@metron/ui'`
- `pnpm turbo run build --filter='!@metron/ui'`
- `pnpm check:abi`, covering 153 generated contract ABIs
- Foundry regression, covering 20 suites and 82 Solidity tests
- Web3 TypeScript tests, covering 5 files and 11 tests
- AI tests, covering 12 tests
- `node --check apps/web3/scripts/zk.mjs`

The AI service was exercised over HTTP. `/health` returned 200. A protected request without `x-metron-service-token` returned 401. The same request with the configured token returned 200 and preserved request provenance in the response.

The runtime service was exercised over HTTP. `/health` returned `{"service":"web3-runtime","status":"alive"}`. `/ready` returned `ready: true` with `financialReadiness: false` because no production chain credentials were configured.

The deployment path was exercised against a local Anvil chain. The guarded deployment runner deployed seven core control-plane contracts. The deployment recorder emitted a schema-valid record, and the deployment validator accepted all seven recorded contracts. The local record was removed after the check.

The corrected Noir workflow was checked in WSL with Noir `1.0.0-beta.12` and Barretenberg `0.87.0`. All three circuits passed `nargo check`, generated witnesses, generated UltraHonk proofs, and passed native Barretenberg verification. Proof outputs were temporary and were not committed.

## Release conditions still requiring external systems

These checks cannot be completed from this workstation without external credentials or services:

- Testnet and mainnet fork runs against live Aave, Uniswap, Chainlink, and LayerZero deployments.
- Cross-chain delivery and replay checks through a live LayerZero endpoint.
- On-chain submission of a generated proof to deployed verifier contracts.
- Full production deployment with real admin keys, RPC URLs, solver services, and service tokens.
- Container build and startup. Docker Desktop was installed but its Linux engine was not running when `docker compose -f infra/docker-compose.yml build` was attempted.

The source tree contains guards for these conditions. The runtime reports financial readiness separately from process readiness, deployment scripts reject missing production configuration, and the ZK script fails when its compiler, proving backend, or prover inputs are absent.

## Scope note

Root lint and typecheck are not release gates for this backend scope because the UI package is being changed by another agent. The known root failures are confined to that package's ignored preview lint glob and its `liquid-glass.tsx` optional-property error.
