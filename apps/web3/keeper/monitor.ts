import type { PositionId } from "@metron/types";

export interface KeeperObservation {
  positionId: PositionId;
  observedDeltaWad: bigint;
  targetDeltaWad: bigint;
  deltaToleranceWad: bigint;
  healthFactorWad: bigint;
  minimumHealthFactorWad: bigint;
  lpDriftBps: number;
  maximumLpDriftBps: number;
  volatilityBps: number;
  maximumVolatilityBps: number;
  stablecoinDeviationBps: number;
  maximumStablecoinDeviationBps: number;
  protocolHealthy: boolean;
  crossChainTimedOut: boolean;
  riskScoreBps: number;
  maximumRiskScoreBps: number;
  observedYieldBps?: number;
  targetYieldBps?: number;
  observedBorrowCostBps?: number;
  maximumBorrowCostBps?: number;
  observedGasUsd?: number;
  maximumGasUsd?: number;
  opportunityDecayBps?: number;
  maximumOpportunityDecayBps?: number;
}

export type KeeperTriggerKind =
  | "emergency_unwind"
  | "hedge_rebalance"
  | "lp_recenter"
  | "message_recovery"
  | "yield_rebalance"
  | "borrow_cost_reduction"
  | "execution_requote"
  | "risk_restriction";

export interface KeeperTrigger {
  key: string;
  positionId: PositionId;
  kind: KeeperTriggerKind;
  reason: string;
}

function difference(left: bigint, right: bigint): bigint {
  return left >= right ? left - right : right - left;
}

export function evaluateKeeperObservation(observation: KeeperObservation): KeeperTrigger[] {
  const triggers: KeeperTrigger[] = [];
  const add = (kind: KeeperTriggerKind, reason: string) => {
    triggers.push({
      key: `${observation.positionId}:${kind}`,
      positionId: observation.positionId,
      kind,
      reason,
    });
  };
  if (observation.healthFactorWad < observation.minimumHealthFactorWad) {
    add("emergency_unwind", "health factor is below the configured minimum");
  }
  if (
    difference(observation.observedDeltaWad, observation.targetDeltaWad) >
    observation.deltaToleranceWad
  ) {
    add("hedge_rebalance", "net delta is outside the configured tolerance");
  }
  if (observation.lpDriftBps > observation.maximumLpDriftBps) {
    add("lp_recenter", "liquidity position drift exceeds the configured bound");
  }
  if (
    observation.observedYieldBps !== undefined &&
    observation.targetYieldBps !== undefined &&
    observation.observedYieldBps < observation.targetYieldBps
  ) {
    add("yield_rebalance", "observed yield is below the strategy target");
  }
  if (
    observation.observedBorrowCostBps !== undefined &&
    observation.maximumBorrowCostBps !== undefined &&
    observation.observedBorrowCostBps > observation.maximumBorrowCostBps
  ) {
    add("borrow_cost_reduction", "borrowing cost exceeds the configured bound");
  }
  if (
    (observation.observedGasUsd !== undefined &&
      observation.maximumGasUsd !== undefined &&
      observation.observedGasUsd > observation.maximumGasUsd) ||
    (observation.opportunityDecayBps !== undefined &&
      observation.maximumOpportunityDecayBps !== undefined &&
      observation.opportunityDecayBps > observation.maximumOpportunityDecayBps)
  ) {
    add("execution_requote", "execution cost or opportunity decay exceeds the configured bound");
  }
  if (observation.crossChainTimedOut) {
    add("message_recovery", "cross-chain message exceeded its timeout");
  }
  if (
    observation.volatilityBps > observation.maximumVolatilityBps ||
    Math.abs(observation.stablecoinDeviationBps) > observation.maximumStablecoinDeviationBps ||
    !observation.protocolHealthy ||
    observation.riskScoreBps > observation.maximumRiskScoreBps
  ) {
    add("risk_restriction", "market or protocol risk gate is outside its configured bound");
  }
  return triggers;
}

export class KeeperIdempotency {
  private readonly submitted = new Set<string>();

  filterNew(triggers: readonly KeeperTrigger[]): KeeperTrigger[] {
    return triggers.filter((trigger) => !this.submitted.has(trigger.key));
  }

  markSubmitted(trigger: KeeperTrigger): void {
    this.submitted.add(trigger.key);
  }

  forget(triggers: readonly KeeperTrigger[]): void {
    for (const trigger of triggers) this.submitted.delete(trigger.key);
  }
}
