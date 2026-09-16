# Metron operations runbook

## Start local services

1. Copy `.env.example` to a local environment file.
2. Set a service token with at least 32 characters.
3. Run `pnpm install` and `pnpm build`.
4. Run `docker compose -f infra/docker-compose.yml up --build`.
5. Check AI liveness at `/health`. Check solver and keeper liveness at `/health` and readiness at `/ready`.

Readiness is separate from process liveness. A ready process still needs valid chain RPCs, contract configuration, fresh oracle data, and scoped credentials before it can perform financial work.

## Deployment

Use one deployer key per environment. Set the RPC URL for the selected chain, `DEPLOYER_PRIVATE_KEY`, and `EXPECTED_ADMIN_ADDRESS`. Reject a run when any required value is missing or when the expected admin is not the configured multisig or timelock. Record chain ID, transaction hashes, bytecode hashes, compiler version, source commit, and deployment time. Run `pnpm check:abi` and read back every role, peer, adapter, oracle, and automation configuration before enabling keepers.

Never place user custody keys in keeper or deployment environments. Keep AI and Convex service tokens in separate secret stores. Rotate a compromised key by revoking its contract role, granting the replacement role, and checking the emitted role events.

## Incident response

### Stale oracle or depeg

Pause risk-increasing execution. Move the circuit breaker to `RESTRICTED` or `EMERGENCY` with a nonzero reason code. Preserve the observed feed values and trace ID. Resume only after primary and secondary feeds agree and read-back checks pass.

### Delayed or failed cross-chain message

Do not mark destination work as rolled back. Record the GUID, source peer, nonce, expiry, and destination status. Mark expired messages after the deadline, then retry the same payload only through the adapter retry path. If the destination executed, reconcile the destination event before any source-side recovery.

### Emergency unwind

Stop new risk-increasing actions. Submit a bounded unwind with an approved flash provider, token, deadline, and recovery action list. The callback must repay principal and fee or the transaction reverts. Confirm the position state and residual vault balances after settlement.

### Key compromise

Revoke the compromised role first. Pause the affected contracts if execution authority is uncertain. Rotate the secret in the external store, grant the replacement role, and verify that no keeper or deployer account retains broader permissions than intended.

## Rollback

Contract deployments are immutable. Roll back by disabling the affected adapter, peer, feed, or automation role and pointing services to the last verified deployment record. Do not send a compensating transaction until both source and destination state have been reconciled.
