import { INTENT_SCHEMA_VERSION, type CanonicalIntent } from "@metron/types";
import { describe, expect, it } from "vitest";

import { createIntentCommitment, hashNormalizedIntent } from "../src/index.js";

const intent: CanonicalIntent = {
  schemaVersion: INTENT_SCHEMA_VERSION,
  owner: "0x1111111111111111111111111111111111111111",
  nonce: "7",
  expiresAt: 2_000_000_000,
  objective: { targetApyMinBps: 800 },
  risk: {
    maxDrawdownBps: 500,
    maxSlippageBps: 100,
    maxCapitalMoveBps: 1_000,
    maxCollateralSaleBps: 800,
  },
  exposure: { targetDeltaWad: "0", deltaToleranceWad: "100000000000000000" },
  chains: [421614, 11155111],
  protocols: ["uniswap-v4", "aave-v3"],
  assets: [
    "0x3333333333333333333333333333333333333333",
    "0x2222222222222222222222222222222222222222",
  ],
  automation: { rebalance: true, recovery: true, emergencyUnwind: false },
  privacy: { privateParameters: true, zkOwnershipRequired: true, zkCollateralRequired: false },
};

describe("intent commitment", () => {
  it("is stable across set ordering and address casing", () => {
    const reordered: CanonicalIntent = {
      ...intent,
      owner: intent.owner.toUpperCase().replace("0X", "0x") as CanonicalIntent["owner"],
      chains: [...intent.chains].reverse(),
      protocols: [...intent.protocols].reverse(),
      assets: [...intent.assets].reverse(),
    };
    expect(hashNormalizedIntent(reordered)).toBe(hashNormalizedIntent(intent));
  });

  it("binds the user secret and nullifier nonce", () => {
    const secret = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(createIntentCommitment(intent, secret, 1n)).not.toBe(
      createIntentCommitment(intent, secret, 2n),
    );
  });
});
