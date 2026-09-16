import { INTENT_SCHEMA_VERSION } from "@metron/types";
import { describe, expect, it } from "vitest";

import { canonicalIntentSchema } from "../src/index.js";

const validIntent = {
  schemaVersion: INTENT_SCHEMA_VERSION,
  owner: "0x1111111111111111111111111111111111111111",
  nonce: "1",
  expiresAt: 2_000_000_000,
  objective: { targetApyMinBps: 800, targetApyMaxBps: 1_200 },
  risk: {
    maxDrawdownBps: 500,
    maxImpermanentLossBps: 200,
    maxLiquidationProbabilityBps: 1_000,
    minHealthFactorWad: "1200000000000000000",
    maxSlippageBps: 100,
    maxCapitalMoveBps: 1_000,
    maxCollateralSaleBps: 800,
    maxRepaymentAmount: "500000000",
    maxGasFeeUsd: "50",
  },
  exposure: { targetDeltaWad: "0", deltaToleranceWad: "100000000000000000" },
  chains: [11155111, 421614],
  protocols: ["aave-v3", "uniswap-v4"],
  assets: [
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
  ],
  automation: { rebalance: true, recovery: true, emergencyUnwind: true },
  privacy: { privateParameters: true, zkOwnershipRequired: true, zkCollateralRequired: false },
} as const;

describe("canonicalIntentSchema", () => {
  it("accepts a bounded canonical intent", () => {
    expect(canonicalIntentSchema.parse(validIntent)).toEqual(validIntent);
  });

  it("rejects inverted APY bounds", () => {
    const result = canonicalIntentSchema.safeParse({
      ...validIntent,
      objective: { targetApyMinBps: 1_300, targetApyMaxBps: 1_200 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate chains and case-insensitive duplicate assets", () => {
    const result = canonicalIntentSchema.safeParse({
      ...validIntent,
      chains: [11155111, 11155111],
      assets: [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slippage limit above one hundred percent", () => {
    const result = canonicalIntentSchema.safeParse({
      ...validIntent,
      risk: { ...validIntent.risk, maxSlippageBps: 10_001 },
    });
    expect(result.success).toBe(false);
  });
});
