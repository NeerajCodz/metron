import type { RouteScoreBreakdown, SolverRoute } from "@metron/types";

export interface RouteScoreWeights {
  yield: bigint;
  cost: bigint;
  slippage: bigint;
  liquidity: bigint;
  drawdown: bigint;
  liquidation: bigint;
  impermanentLoss: bigint;
  crossChain: bigint;
  delta: bigint;
  health: bigint;
}

export interface RouteScoreLimits {
  maximumSlippageBps: bigint;
  maximumDrawdownBps: bigint;
  maximumLiquidationProbabilityBps?: bigint;
  maximumImpermanentLossBps?: bigint;
  targetDeltaWad: bigint;
  deltaToleranceWad: bigint;
  minimumHealthFactorWad?: bigint;
}

export const DEFAULT_ROUTE_SCORE_WEIGHTS: RouteScoreWeights = {
  yield: 20n,
  cost: 8n,
  slippage: 10n,
  liquidity: 12n,
  drawdown: 12n,
  liquidation: 16n,
  impermanentLoss: 8n,
  crossChain: 4n,
  delta: 6n,
  health: 4n,
};

function decimalUsdToMicros(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  const micros = `${fraction}000000`.slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(micros);
}

export function scoreRoute(
  route: SolverRoute,
  limits: RouteScoreLimits,
  weights: RouteScoreWeights = DEFAULT_ROUTE_SCORE_WEIGHTS,
): RouteScoreBreakdown {
  const rejectionReasons: string[] = [];
  if (BigInt(route.estimatedSlippageBps) > limits.maximumSlippageBps) {
    rejectionReasons.push("MAX_SLIPPAGE_EXCEEDED");
  }
  if (BigInt(route.expectedDrawdownBps) > limits.maximumDrawdownBps) {
    rejectionReasons.push("MAX_DRAWDOWN_EXCEEDED");
  }
  if (
    limits.maximumLiquidationProbabilityBps !== undefined &&
    BigInt(route.liquidationProbabilityBps) > limits.maximumLiquidationProbabilityBps
  ) {
    rejectionReasons.push("MAX_LIQUIDATION_PROBABILITY_EXCEEDED");
  }
  if (
    limits.maximumImpermanentLossBps !== undefined &&
    route.expectedImpermanentLossBps !== undefined &&
    BigInt(route.expectedImpermanentLossBps) > limits.maximumImpermanentLossBps
  ) {
    rejectionReasons.push("MAX_IMPERMANENT_LOSS_EXCEEDED");
  }

  const deltaDeviation =
    BigInt(route.resultingDeltaWad) >= limits.targetDeltaWad
      ? BigInt(route.resultingDeltaWad) - limits.targetDeltaWad
      : limits.targetDeltaWad - BigInt(route.resultingDeltaWad);
  if (deltaDeviation > limits.deltaToleranceWad) {
    rejectionReasons.push("DELTA_TOLERANCE_EXCEEDED");
  }

  const healthFactor = route.resultingHealthFactorWad
    ? BigInt(route.resultingHealthFactorWad)
    : undefined;
  if (
    limits.minimumHealthFactorWad !== undefined &&
    (healthFactor === undefined || healthFactor < limits.minimumHealthFactorWad)
  ) {
    rejectionReasons.push("MINIMUM_HEALTH_FACTOR_NOT_MET");
  }

  const yieldScore = BigInt(route.expectedNetApyBps) * weights.yield;
  const costPenalty =
    (decimalUsdToMicros(route.estimatedGasUsd) + decimalUsdToMicros(route.bridgeCostUsd)) *
    weights.cost;
  const slippagePenalty = BigInt(route.estimatedSlippageBps) * weights.slippage;
  const liquidityScore = BigInt(route.liquidityScoreBps) * weights.liquidity;
  const drawdownPenalty = BigInt(route.expectedDrawdownBps) * weights.drawdown;
  const liquidationPenalty = BigInt(route.liquidationProbabilityBps) * weights.liquidation;
  const impermanentLossPenalty =
    BigInt(route.expectedImpermanentLossBps ?? 0) * weights.impermanentLoss;
  const crossChainPenalty = decimalUsdToMicros(route.bridgeCostUsd) * weights.crossChain;
  const deltaPenalty = (deltaDeviation / 10n ** 14n) * weights.delta;
  const healthPenalty =
    limits.minimumHealthFactorWad === undefined || healthFactor === undefined
      ? 0n
      : healthFactor >= limits.minimumHealthFactorWad
        ? 0n
        : ((limits.minimumHealthFactorWad - healthFactor) * weights.health) / 10n ** 14n;

  const totalScore =
    yieldScore +
    liquidityScore -
    costPenalty -
    slippagePenalty -
    drawdownPenalty -
    liquidationPenalty -
    impermanentLossPenalty -
    crossChainPenalty -
    deltaPenalty -
    healthPenalty;

  return {
    routeId: route.routeId,
    scoreVersion: route.scoreVersion,
    totalScore: totalScore.toString(),
    yieldScore: yieldScore.toString(),
    costPenalty: costPenalty.toString(),
    slippagePenalty: slippagePenalty.toString(),
    liquidityScore: liquidityScore.toString(),
    drawdownPenalty: drawdownPenalty.toString(),
    liquidationPenalty: liquidationPenalty.toString(),
    impermanentLossPenalty: impermanentLossPenalty.toString(),
    crossChainPenalty: crossChainPenalty.toString(),
    deltaPenalty: deltaPenalty.toString(),
    healthPenalty: healthPenalty.toString(),
    constraintsSatisfied: rejectionReasons.length === 0,
    rejectionReasons,
  };
}

export function compareRouteScores(left: RouteScoreBreakdown, right: RouteScoreBreakdown): number {
  if (left.constraintsSatisfied !== right.constraintsSatisfied) {
    return left.constraintsSatisfied ? -1 : 1;
  }
  const leftScore = BigInt(left.totalScore);
  const rightScore = BigInt(right.totalScore);
  if (leftScore === rightScore) {
    return left.routeId.localeCompare(right.routeId);
  }
  return leftScore > rightScore ? -1 : 1;
}
