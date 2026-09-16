import type { CanonicalIntent, RouteScoreBreakdown, SolverRoute } from "@metron/types";
import {
  compareRouteScores,
  scoreRoute,
  type RouteScoreLimits,
  type RouteScoreWeights,
  DEFAULT_ROUTE_SCORE_WEIGHTS,
} from "@metron/protocol";

export interface ScoredRoute {
  route: SolverRoute;
  score: RouteScoreBreakdown;
}

export function scoreLimitsFromIntent(intent: CanonicalIntent): RouteScoreLimits {
  const optionalLimits = {
    ...(intent.risk.maxLiquidationProbabilityBps === undefined
      ? {}
      : { maximumLiquidationProbabilityBps: BigInt(intent.risk.maxLiquidationProbabilityBps) }),
    ...(intent.risk.maxImpermanentLossBps === undefined
      ? {}
      : { maximumImpermanentLossBps: BigInt(intent.risk.maxImpermanentLossBps) }),
    ...(intent.risk.minHealthFactorWad === undefined
      ? {}
      : { minimumHealthFactorWad: BigInt(intent.risk.minHealthFactorWad) }),
  };
  return {
    maximumSlippageBps: BigInt(intent.risk.maxSlippageBps),
    maximumDrawdownBps: BigInt(intent.risk.maxDrawdownBps),
    targetDeltaWad: BigInt(intent.exposure.targetDeltaWad),
    deltaToleranceWad: BigInt(intent.exposure.deltaToleranceWad),
    ...optionalLimits,
  };
}

export function rankRoutes(
  routes: readonly SolverRoute[],
  intent: CanonicalIntent,
  weights: RouteScoreWeights = DEFAULT_ROUTE_SCORE_WEIGHTS,
): ScoredRoute[] {
  const limits = scoreLimitsFromIntent(intent);
  return routes
    .map((route) => ({ route, score: scoreRoute(route, limits, weights) }))
    .sort((left, right) => compareRouteScores(left.score, right.score));
}

export function selectBestRoute(scoredRoutes: readonly ScoredRoute[]): ScoredRoute {
  const selected = scoredRoutes.find((candidate) => candidate.score.constraintsSatisfied);
  if (!selected) throw new Error("no route satisfies intent constraints");
  return selected;
}
