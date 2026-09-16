import type { Address, Bytes32 } from "@metron/types";
import type { PublicClient } from "viem";

const STATE_VIEW_ABI = [
  {
    type: "function",
    name: "getSlot0",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
  {
    type: "function",
    name: "getLiquidity",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
  {
    type: "function",
    name: "getPositionLiquidity",
    stateMutability: "view",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "positionId", type: "bytes32" },
    ],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
] as const;

export interface UniswapPoolState {
  stateView: Address;
  poolId: Bytes32;
  sqrtPriceX96: bigint;
  tick: number;
  protocolFee: number;
  lpFee: number;
  liquidity: bigint;
}

export async function readUniswapPoolState(
  client: PublicClient,
  stateView: Address,
  poolId: Bytes32,
): Promise<UniswapPoolState> {
  const [slot0, liquidity] = await Promise.all([
    client.readContract({ address: stateView, abi: STATE_VIEW_ABI, functionName: "getSlot0", args: [poolId] }),
    client.readContract({ address: stateView, abi: STATE_VIEW_ABI, functionName: "getLiquidity", args: [poolId] }),
  ]);
  return {
    stateView,
    poolId,
    sqrtPriceX96: slot0[0],
    tick: Number(slot0[1]),
    protocolFee: Number(slot0[2]),
    lpFee: Number(slot0[3]),
    liquidity,
  };
}

export async function readUniswapPositionLiquidity(
  client: PublicClient,
  stateView: Address,
  poolId: Bytes32,
  positionId: Bytes32,
): Promise<bigint> {
  return client.readContract({
    address: stateView,
    abi: STATE_VIEW_ABI,
    functionName: "getPositionLiquidity",
    args: [poolId, positionId],
  });
}

export function sqrtPriceX96ToRatioX192(sqrtPriceX96: bigint): bigint {
  if (sqrtPriceX96 <= 0n) throw new RangeError("sqrt price must be positive");
  return sqrtPriceX96 * sqrtPriceX96;
}
