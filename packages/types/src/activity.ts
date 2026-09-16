import type {
  ChainId,
  IntentId,
  PositionId,
  SolverId,
  TraceId,
  TransactionHash,
  UnixSeconds,
} from "./primitives.js";

export interface ActivityRecord {
  activityId: string;
  traceId: TraceId;
  intentId?: IntentId;
  positionId?: PositionId;
  chainId?: ChainId;
  transactionHash?: TransactionHash;
  solverId?: SolverId;
  modelVersion?: string;
  actionType: string;
  status: "pending" | "succeeded" | "failed";
  timestamp: UnixSeconds;
  failureCode?: string;
  details: Record<string, string | number | boolean>;
}
