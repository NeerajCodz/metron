import { SOLVER_ROUTE_SCHEMA_VERSION, type SolverRoute } from "@metron/types";
import { describe, expect, it } from "vitest";

import { compareRouteScores, scoreRoute } from "../src/index.js";

const route: SolverRoute = {
  schemaVersion: SOLVER_ROUTE_SCHEMA_VERSION,
  routeId: "route-a",
  solverId: "solver-1",
  intentId: "intent-1",
  strategyId: "strategy-1",
  actions: [
    {
      actionIndex: 0,
      chainId: 421614,
      protocol: "aave-v3",
      actionType: "supply",
      target: "0x1111111111111111111111111111111111111111",
      amount: "1000",
      calldata: "0x",
    },
  ],
  expectedNetApyBps: 1_000,
  expectedDrawdownBps: 300,
  liquidationProbabilityBps: 200,
  estimatedGasUsd: "2",
  estimatedSlippageBps: 20,
  bridgeCostUsd: "0",
  resultingDeltaWad: "0",
  resultingHealthFactorWad: "1500000000000000000",
  liquidityScoreBps: 8_000,
  validityDeadline: 2_000_000_000,
  scoreVersion: "score-1",
};

const limits = {
  maximumSlippageBps: 100n,
  maximumDrawdownBps: 500n,
  maximumLiquidationProbabilityBps: 1_000n,
  targetDeltaWad: 0n,
  deltaToleranceWad: 100_000_000_000_000_000n,
  minimumHealthFactorWad: 1_200_000_000_000_000_000n,
};

describe("route scoring", () => {
  it("rejects a route that breaches a hard limit", () => {
    const score = scoreRoute({ ...route, estimatedSlippageBps: 101 }, limits);
    expect(score.constraintsSatisfied).toBe(false);
    expect(score.rejectionReasons).toContain("MAX_SLIPPAGE_EXCEEDED");
  });

  it("sorts valid routes before invalid routes regardless of numeric score", () => {
    const valid = scoreRoute(route, limits);
    const invalid = scoreRoute(
      { ...route, routeId: "route-b", expectedNetApyBps: 10_000, estimatedSlippageBps: 101 },
      limits,
    );
    expect([invalid, valid].sort(compareRouteScores)[0]?.routeId).toBe("route-a");
  });
});
