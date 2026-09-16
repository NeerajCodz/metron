import type { Address } from "@metron/types";
import type { PublicClient } from "viem";

const CHAINLINK_AGGREGATOR_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "description",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint80", name: "roundId" },
      { type: "int256", name: "answer" },
      { type: "uint256", name: "startedAt" },
      { type: "uint256", name: "updatedAt" },
      { type: "uint80", name: "answeredInRound" },
    ],
  },
] as const;

export interface ChainlinkObservation {
  feed: Address;
  description: string;
  decimals: number;
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
}

export async function readChainlinkObservation(
  client: PublicClient,
  feed: Address,
): Promise<ChainlinkObservation> {
  const [decimals, description, round] = await Promise.all([
    client.readContract({ address: feed, abi: CHAINLINK_AGGREGATOR_ABI, functionName: "decimals" }),
    client.readContract({ address: feed, abi: CHAINLINK_AGGREGATOR_ABI, functionName: "description" }),
    client.readContract({ address: feed, abi: CHAINLINK_AGGREGATOR_ABI, functionName: "latestRoundData" }),
  ]);
  return {
    feed,
    description,
    decimals: Number(decimals),
    roundId: round[0],
    answer: round[1],
    startedAt: round[2],
    updatedAt: round[3],
    answeredInRound: round[4],
  };
}

export function normalizeChainlinkAnswer(answer: bigint, decimals: number): bigint {
  if (answer <= 0n) throw new RangeError("Chainlink answer must be positive");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("Chainlink decimals are outside uint8 range");
  }
  if (decimals === 18) return answer;
  if (decimals < 18) return answer * 10n ** BigInt(18 - decimals);
  return answer / 10n ** BigInt(decimals - 18);
}
