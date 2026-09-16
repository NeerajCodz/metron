import type {
  Address,
  ChainId,
  ExecutionId,
  IntentId,
  PositionId,
  SolverId,
  TraceId,
  TransactionHash,
} from "./primitives.js";

export const AUDIT_EVENT_SCHEMA_VERSION = "audit-event-v1" as const;

export type ExecutionStatus = "pending" | "submitted" | "confirmed" | "failed" | "expired";
export type IntentEventStatus =
  | "draft"
  | "published"
  | "authorized"
  | "auctioning"
  | "settled"
  | "cancelled"
  | "expired";
export type SolverEventStatus = "committed" | "revealed" | "selected" | "rejected";
export type ComponentEventStatus = "observed" | "updated" | "replaced";
export type PredictionEventStatus = "generated" | "rejected";
export type AlertEventStatus = "opened" | "acknowledged" | "resolved" | "triggered";
export type CrossChainEventStatus =
  | "created"
  | "source_locked"
  | "message_sent"
  | "destination_received"
  | "destination_executed"
  | "ack_sent"
  | "confirmed"
  | "expired"
  | "failed"
  | "recovery_required";

export interface AuditEventBase {
  eventId: string;
  schemaVersion: typeof AUDIT_EVENT_SCHEMA_VERSION;
  timestampMs: number;
  traceId: TraceId;
  ownerAddress: Address;
  intentId?: IntentId;
  positionId?: PositionId;
  chainId?: ChainId;
  transactionHash?: TransactionHash;
  details: Record<string, string | number | boolean | null>;
}

export interface IntentAuditEvent extends AuditEventBase {
  eventType: "intent";
  intentId: IntentId;
  status: IntentEventStatus;
}

export interface SolverAuditEvent extends AuditEventBase {
  eventType: "solver";
  intentId: IntentId;
  solverId: SolverId;
  status: SolverEventStatus;
}

export interface ExecutionAuditEvent extends AuditEventBase {
  eventType: "execution";
  executionId: ExecutionId;
  intentId: IntentId;
  status: ExecutionStatus;
}

export interface ComponentAuditEvent extends AuditEventBase {
  eventType: "component";
  positionId: PositionId;
  componentId: string;
  status: ComponentEventStatus;
}

export interface RiskSnapshotAuditEvent extends AuditEventBase {
  eventType: "risk_snapshot";
  positionId: PositionId;
  snapshotId: string;
  status: "observed";
}

export interface PredictionRecommendationAuditEvent extends AuditEventBase {
  eventType: "prediction" | "recommendation";
  positionId?: PositionId;
  predictionId?: string;
  recommendationId?: string;
  status: PredictionEventStatus;
}

export interface AlertEmergencyAuditEvent extends AuditEventBase {
  eventType: "alert" | "emergency";
  positionId?: PositionId;
  alertId?: string;
  status: AlertEventStatus;
}

export interface CrossChainAuditEvent extends AuditEventBase {
  eventType: "cross_chain";
  positionId?: PositionId;
  messageId: string;
  status: CrossChainEventStatus;
}

export type AuditEvent =
  | IntentAuditEvent
  | SolverAuditEvent
  | ExecutionAuditEvent
  | ComponentAuditEvent
  | RiskSnapshotAuditEvent
  | PredictionRecommendationAuditEvent
  | AlertEmergencyAuditEvent
  | CrossChainAuditEvent;

export interface CrossChainTransition {
  messageId: string;
  from: CrossChainEventStatus;
  to: CrossChainEventStatus;
  timestampMs: number;
  traceId: TraceId;
  payloadHash: string;
  failureCode?: string;
  transactionHash?: TransactionHash;
}

export interface ExecutionRecord {
  executionKey: string;
  intentId: IntentId;
  positionId?: PositionId;
  strategyId?: string;
  actionType: string;
  status: ExecutionStatus;
  chainId: ChainId;
  transactionHash?: TransactionHash;
  failureCode?: string;
  traceId: TraceId;
  submittedAt?: number;
  confirmedAt?: number;
  updatedAtMs: number;
}