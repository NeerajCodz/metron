import { describe, expect, it } from "vitest";

import { CHAIN_IDS, validateDeploymentForChain } from "../src/index.js";

const validDeployment = {
  schemaVersion: "1.0.0",
  chainId: CHAIN_IDS.baseSepolia,
  layerZeroEndpointId: 40_260,
  protocols: {
    layerZeroEndpoint: "0x1111111111111111111111111111111111111111",
    chainlinkFeeds: {
      ETH_USD: "0x2222222222222222222222222222222222222222",
    },
    supportedAssets: {
      WETH: "0x3333333333333333333333333333333333333333",
    },
  },
  contracts: {
    Vault: {
      address: "0x4444444444444444444444444444444444444444",
      deploymentTransaction: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      bytecodeHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      compilerVersion: "0.8.30",
      sourceCommit: "abcdef1",
      deployedAt: 2_000_000_000,
    },
  },
} as const;

describe("deployment configuration", () => {
  it("accepts a deployment for its declared chain", () => {
    expect(validateDeploymentForChain("baseSepolia", validDeployment).chainId).toBe(
      CHAIN_IDS.baseSepolia,
    );
  });

  it("rejects a deployment filed under the wrong chain", () => {
    expect(() => validateDeploymentForChain("arbitrumSepolia", validDeployment)).toThrow(
      /does not match/,
    );
  });

  it("rejects zero addresses in protocol or contract records", () => {
    const invalid = {
      ...validDeployment,
      protocols: {
        ...validDeployment.protocols,
        layerZeroEndpoint: "0x0000000000000000000000000000000000000000",
      },
    };
    expect(() => validateDeploymentForChain("baseSepolia", invalid)).toThrow(/zero address/);
  });
});
