import type {
  Address,
  ChainId,
  PercentageBps,
  PositionComponentId,
  PositionId,
  StrategyId,
  UnixSeconds,
  UsdAmount,
} from "./primitives.js";

export type PositionStatus =
  "pending" | "active" | "restricted" | "emergency" | "unwinding" | "closed" | "failed";

export type PositionComponentType =
  "vault" | "lending" | "liquidity" | "hedge" | "cross_chain" | "insurance";

export interface PositionComponent {
  componentId: PositionComponentId;
  positionId: PositionId;
  type: PositionComponentType;
  chainId: ChainId;
  protocol: string;
  contractAddress: Address;
  assetAddresses: Address[];
  valueUsd: UsdAmount;
  deltaWad: string;
  healthFactorWad?: string;
  metadata: Record<string, string | number | boolean>;
  updatedAt: UnixSeconds;
}

export interface IndexedPosition {
  positionId: PositionId;
  ownerAddress: Address;
  strategyId: StrategyId;
  status: PositionStatus;
  coordinationChainId: ChainId;
  componentIds: PositionComponentId[];
  latestBlockByChain: Record<string, number>;
  netValueUsd: UsdAmount;
  netDeltaWad: string;
  healthFactorWad?: string;
  liquidationProbabilityBps?: PercentageBps;
  lastRiskSnapshotId?: string;
  updatedAt: UnixSeconds;
}
