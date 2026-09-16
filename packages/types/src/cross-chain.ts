import type {
  Address,
  Bytes32,
  ChainId,
  IntentId,
  PositionId,
  TraceId,
  TransactionHash,
  UnixSeconds,
} from "./primitives.js";

export type CrossChainState =
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

export interface CrossChainMessage {
  messageId: Bytes32;
  messageVersion: number;
  traceId: TraceId;
  sourceChainId: ChainId;
  destinationChainId: ChainId;
  sourceContract: Address;
  destinationContract: Address;
  intentId?: IntentId;
  positionId?: PositionId;
  actionType: string;
  payloadHash: Bytes32;
  nonce: string;
  expiry: UnixSeconds;
  state: CrossChainState;
  sourceTransactionHash?: TransactionHash;
  destinationTransactionHash?: TransactionHash;
  failureCode?: string;
  updatedAt: UnixSeconds;
}
