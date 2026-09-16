import type { Address } from "@metron/types";
import type { PublicClient } from "viem";

const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "getUserAccountData",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getReserveNormalizedIncome",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getReserveNormalizedVariableDebt",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export interface AaveAccountData {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

export interface AaveReserveIndexes {
  asset: Address;
  normalizedIncome: bigint;
  normalizedVariableDebt: bigint;
}

export async function readAaveAccountData(
  client: PublicClient,
  pool: Address,
  user: Address,
): Promise<AaveAccountData> {
  const result = await client.readContract({
    address: pool,
    abi: AAVE_POOL_ABI,
    functionName: "getUserAccountData",
    args: [user],
  });
  return {
    totalCollateralBase: result[0],
    totalDebtBase: result[1],
    availableBorrowsBase: result[2],
    currentLiquidationThreshold: result[3],
    ltv: result[4],
    healthFactor: result[5],
  };
}

export async function readAaveReserveIndexes(
  client: PublicClient,
  pool: Address,
  asset: Address,
): Promise<AaveReserveIndexes> {
  const [normalizedIncome, normalizedVariableDebt] = await Promise.all([
    client.readContract({
      address: pool,
      abi: AAVE_POOL_ABI,
      functionName: "getReserveNormalizedIncome",
      args: [asset],
    }),
    client.readContract({
      address: pool,
      abi: AAVE_POOL_ABI,
      functionName: "getReserveNormalizedVariableDebt",
      args: [asset],
    }),
  ]);
  return { asset, normalizedIncome, normalizedVariableDebt };
}
