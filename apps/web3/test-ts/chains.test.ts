import { describe, expect, it } from "vitest";

import { createChainRuntime, createRequiredChainRuntimes } from "../chains/index.js";

describe("chain runtime", () => {
  it("requires the configured RPC environment variable", () => {
    expect(() => createChainRuntime("baseSepolia", {})).toThrow(/Missing BASE_SEPOLIA_RPC_URL/);
  });

  it("creates all required clients from explicit RPC configuration", () => {
    const runtimes = createRequiredChainRuntimes({
      ETHEREUM_SEPOLIA_RPC_URL: "https://ethereum.example",
      ARBITRUM_SEPOLIA_RPC_URL: "https://arbitrum.example",
      BASE_SEPOLIA_RPC_URL: "https://base.example",
    });
    expect(runtimes.map(({ key }) => key)).toEqual([
      "ethereumSepolia",
      "arbitrumSepolia",
      "baseSepolia",
    ]);
  });
});
