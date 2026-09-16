# Metron backend threat model

## Trust boundaries

Users sign intent payloads and own vault balances. The EVM contracts enforce ownership, deadlines, protocol allowlists, execution limits, and replay protection. Convex stores indexed projections. The AI service gives bounded advice and never authorizes a transaction. Solvers propose routes but cannot move funds without an on-chain authorization. Keepers can call only explicitly granted automation roles.

## Threats and controls

| Threat                         | Control                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custody key compromise         | Vault withdrawals require owner authorization. Automation roles cannot withdraw arbitrary funds. Keep deployer, keeper, relay, and service credentials separate. |
| Solver manipulation            | Sealed commitments, reveal windows, deterministic score selection, registered operators, route replay checks, and intent settlement deadlines.                   |
| Oracle failure                 | Freshness checks, optional secondary feeds, divergence checks, bounded risk actions, and circuit-breaker transitions.                                            |
| Cross-chain replay or spoofing | LayerZero endpoint caller checks, configured source peers, message GUID tracking, expiry, destination allowlists, and explicit failed or recovery states.        |
| Keeper compromise              | Keeper roles are limited to bounded rebalance, recovery, or emergency calls. User funds remain behind vault reservations and policies.                           |
| Model failure                  | Versioned schemas, numerical bounds, deterministic fallback models, provenance in explanations, and no AI-only insurance claims.                                 |
| ZK replay                      | Circuit versioning, public input length checks, verifier delegation, and consumed ownership nullifiers.                                                          |
| Convex projection error        | Idempotent indexes, monotonic block checks, trace IDs, and on-chain state as the financial authority.                                                            |

## Operational assumptions

Contract admins are trusted to configure roles, peers, feeds, adapters, and reserve coverage. LayerZero endpoint security and configured protocol contracts are external dependencies. The AI service is advisory. Public EVM deposits and execution remain public even when a proof hides witness values.
