import { describe, expect, it } from "vitest";

import {
  normalizeChainlinkAnswer,
  readChainlinkObservation,
} from "../adapters/chainlink/client.js";
import { readAaveAccountData, readAaveReserveIndexes } from "../adapters/aave/client.js";
import {
  readUniswapPoolState,
  readUniswapPositionLiquidity,
  sqrtPriceX96ToRatioX192,
} from "../adapters/uniswap/client.js";

type ContractCall = {
  functionName: string;
  result: unknown;
};

function clientFor(calls: ContractCall[]) {
  return {
    readContract: async ({ functionName }: { functionName: string }) => {
      const call = calls.find((entry) => entry.functionName === functionName);
      if (!call) throw new Error(`unexpected call ${functionName}`);
      return call.result;
    },
  } as never;
}

describe("offchain protocol readers", () => {
  it("reads and normalizes Chainlink feed metadata", async () => {
    const observation = await readChainlinkObservation(
      clientFor([
        { functionName: "decimals", result: 8 },
        { functionName: "description", result: "ETH / USD" },
        { functionName: "latestRoundData", result: [12n, 2_000n * 10n ** 8n, 0n, 100n, 12n] },
      ]),
      "0x1111111111111111111111111111111111111111",
    );
    expect(observation.answer).toBe(200_000_000_000n);
    expect(normalizeChainlinkAnswer(observation.answer, observation.decimals)).toBe(
      2_000n * 10n ** 18n,
    );
  });

  it("reads Aave account data and reserve indexes", async () => {
    const client = clientFor([
      {
        functionName: "getUserAccountData",
        result: [100n, 40n, 60n, 8_000n, 7_500n, 2n * 10n ** 18n],
      },
      { functionName: "getReserveNormalizedIncome", result: 1_01n * 10n ** 16n },
      { functionName: "getReserveNormalizedVariableDebt", result: 1_02n * 10n ** 16n },
    ]);
    await expect(
      readAaveAccountData(
        client,
        "0x2222222222222222222222222222222222222222",
        "0x3333333333333333333333333333333333333333",
      ),
    ).resolves.toMatchObject({ totalDebtBase: 40n, healthFactor: 2n * 10n ** 18n });
    await expect(
      readAaveReserveIndexes(
        client,
        "0x2222222222222222222222222222222222222222",
        "0x4444444444444444444444444444444444444444",
      ),
    ).resolves.toMatchObject({
      normalizedIncome: 1_01n * 10n ** 16n,
      normalizedVariableDebt: 1_02n * 10n ** 16n,
    });
  });

  it("reads Uniswap pool state and squares Q96 prices exactly", async () => {
    const state = await readUniswapPoolState(
      clientFor([
        { functionName: "getSlot0", result: [2n ** 96n, -10, 0, 3_000] },
        { functionName: "getLiquidity", result: 123_456n },
      ]),
      "0x5555555555555555555555555555555555555555",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(state.tick).toBe(-10);
    expect(state.liquidity).toBe(123_456n);
    expect(sqrtPriceX96ToRatioX192(state.sqrtPriceX96)).toBe(2n ** 192n);
    await expect(
      readUniswapPositionLiquidity(
        clientFor([{ functionName: "getPositionLiquidity", result: 77n }]),
        state.stateView,
        state.poolId,
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ),
    ).resolves.toBe(77n);
  });
});
