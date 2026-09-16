import { describe, expect, it } from "vitest";

import type { CanonicalIntent } from "@metron/types";
import { buildCandidateRoutes, buildComposedCandidateRoutes } from "../solver/routes.js";
import { rankRoutes, selectBestRoute } from "../solver/scorer.js";
import { computeBidCommitment, sealBid, verifyBidCommitment } from "../solver/sealed-bid.js";

const asset = "0x2222222222222222222222222222222222222222" as `0x${string}`;
const intent: CanonicalIntent = {
  schemaVersion: "1.0.0",
  owner: "0x1111111111111111111111111111111111111111",
  nonce: "7",
  expiresAt: 2_000_000_000,
  objective: { targetApyMinBps: 800 },
  risk: {
    maxDrawdownBps: 500,
    maxSlippageBps: 100,
    maxCapitalMoveBps: 1000,
    maxCollateralSaleBps: 800,
  },
  exposure: { targetDeltaWad: "0", deltaToleranceWad: "100000000000000000" },
  chains: [421614, 84532],
  protocols: ["aave-v3", "uniswap-v4"],
  assets: [asset],
  automation: { rebalance: true, recovery: true, emergencyUnwind: false },
  privacy: { privateParameters: false, zkOwnershipRequired: false, zkCollateralRequired: false },
};

const context = {
  solverId: "solver-a",
  intentId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  strategyPrefix: "candidate",
  scoreVersion: "score-v1",
  now: 1_000,
  markets: [
    {
      chainId: 421614,
      asset,
      lendingTarget: "0x3333333333333333333333333333333333333333" as `0x${string}`,
      liquidityTarget: "0x4444444444444444444444444444444444444444" as `0x${string}`,
      expectedNetApyBps: 1200,
      expectedDrawdownBps: 200,
      expectedImpermanentLossBps: 100,
      liquidationProbabilityBps: 50,
      estimatedGasUsd: "1.25",
      estimatedSlippageBps: 20,
      bridgeCostUsd: "0",
      resultingDeltaWad: "0",
      resultingHealthFactorWad: "2000000000000000000",
      liquidityScoreBps: 9000,
      observedAt: 900,
    },
  ],
} as const;

describe("solver route engine", () => {
  it("builds and deterministically ranks qualifying protocol candidates", () => {
    const routes = buildCandidateRoutes(intent, context);
    expect(routes).toHaveLength(2);
    const ranked = rankRoutes(routes, intent);
    expect(selectBestRoute(ranked).score.constraintsSatisfied).toBe(true);
    expect(ranked[0]?.route.routeId).toContain("lending");
    expect(ranked.every((candidate) => candidate.score.rejectionReasons.length === 0)).toBe(true);
  });

  it("builds a composable cross-chain lending, liquidity, and hedge graph", () => {
    const destination = {
      ...context.markets[0],
      chainId: 84532,
      expectedNetApyBps: 1100,
      bridgeCostUsd: "3.00",
    };
    const routes = buildComposedCandidateRoutes(intent, {
      ...context,
      bridgeTarget: "0x5555555555555555555555555555555555555555",
      hedgeTarget: "0x6666666666666666666666666666666666666666",
      destinationMarkets: [destination],
    });
    expect(routes).toHaveLength(1);
    expect(routes[0]?.actions.map((action) => action.actionType)).toEqual([
      "cross_chain_message",
      "supply",
      "add_liquidity",
      "adjust_hedge",
    ]);
    expect(routes[0]?.actions.map((action) => action.chainId)).toEqual([
      421614, 84532, 84532, 84532,
    ]);
  });

  it("matches the Solidity commitment encoding and rejects altered salt", () => {
    const route = buildCandidateRoutes(intent, context)[0]!;
    const intentId = context.intentId as `0x${string}`;
    const solverId =
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
    const salt =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;
    const sealed = sealBid(intentId, solverId, route, salt);
    expect(verifyBidCommitment(intentId, solverId, sealed)).toBe(true);
    expect(computeBidCommitment(intentId, solverId, sealed.routeHash, salt)).toBe(
      sealed.commitment,
    );
    expect(
      verifyBidCommitment(intentId, solverId, {
        ...sealed,
        salt: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      }),
    ).toBe(false);
  });
});
