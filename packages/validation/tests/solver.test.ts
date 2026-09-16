import { SOLVER_ROUTE_SCHEMA_VERSION } from "@metron/types";
import { describe, expect, it } from "vitest";

import { solverRouteSchema } from "../src/index.js";

const route = {
  schemaVersion: SOLVER_ROUTE_SCHEMA_VERSION,
  routeId: "route-1",
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
      assetIn: "0x2222222222222222222222222222222222222222",
      amount: "1000000",
      calldata: "0x",
    },
  ],
  expectedNetApyBps: 900,
  expectedDrawdownBps: 300,
  expectedImpermanentLossBps: 100,
  liquidationProbabilityBps: 200,
  estimatedGasUsd: "2.5",
  estimatedSlippageBps: 20,
  bridgeCostUsd: "0",
  resultingDeltaWad: "0",
  resultingHealthFactorWad: "2000000000000000000",
  liquidityScoreBps: 8_000,
  validityDeadline: 2_000_000_000,
  scoreVersion: "score-1",
} as const;

describe("solverRouteSchema", () => {
  it("accepts actions whose indexes match execution order", () => {
    expect(solverRouteSchema.safeParse(route).success).toBe(true);
  });

  it("rejects reordered action indexes", () => {
    const result = solverRouteSchema.safeParse({
      ...route,
      actions: [{ ...route.actions[0], actionIndex: 1 }],
    });
    expect(result.success).toBe(false);
  });
});
