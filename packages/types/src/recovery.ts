import type {
  Address,
  BasisPoints,
  ChainId,
  PercentageBps,
  PositionId,
  TraceContext,
  UsdAmount,
  VersionedPayload,
} from "./primitives.js";

export const RECOVERY_SCHEMA_VERSION = "1.0.0" as const;

export type RecoveryActionType =
  | "repay_debt"
  | "sell_collateral"
  | "swap_collateral"
  | "adjust_hedge"
  | "withdraw_liquidity"
  | "recenter_liquidity"
  | "reserve_repayment"
  | "combined"
  | "move_to_safe_state";

export interface RecoveryAction {
  actionId: string;
  type: RecoveryActionType;
  chainId: ChainId;
  asset?: Address;
  amount?: string;
  collateralSaleBps?: PercentageBps;
  maxSlippageBps: BasisPoints;
  expectedCostUsd: UsdAmount;
  expectedLossUsd: UsdAmount;
  resultingHealthFactorWad: string;
  resultingDeltaWad: string;
  postActionLiquidationProbabilityBps: PercentageBps;
  protocol: string;
}

export interface RecoveryRanking extends VersionedPayload, TraceContext {
  schemaVersion: typeof RECOVERY_SCHEMA_VERSION;
  positionId: PositionId;
  modelVersion: string;
  featureSchemaVersion: string;
  generatedAt: number;
  candidates: RecoveryAction[];
  rejected: Array<{ actionId: string; reasons: string[] }>;
  fallbackUsed: boolean;
}
