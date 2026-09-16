import type {
  AuditEvent,
  CrossChainMessage,
  ExecutionRecord,
  ExecutionStatus,
  MarketObservation,
  PortfolioGraph,
  PositionId,
  TraceId,
} from "@metron/types";

export interface AiClientOptions {
  baseUrl: string;
  serviceToken: string;
  fetcher?: typeof fetch;
}

export class MetronAiClient {
  private readonly fetcher: typeof fetch;
  constructor(private readonly options: AiClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async request<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
    const response = await this.fetcher(new URL(path, this.options.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-metron-service-token": this.options.serviceToken,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`AI request failed with HTTP ${response.status}`);
    return (await response.json()) as TResponse;
  }

  simulateRecovery<TRequest, TResponse>(body: TRequest): Promise<TResponse> {
    return this.request("/v1/recovery/rank", body);
  }

  answerPosition<TRequest, TResponse>(body: TRequest): Promise<TResponse> {
    return this.request("/v1/position/answer", body);
  }

  explain<TRequest, TResponse>(body: TRequest): Promise<TResponse> {
    return this.request("/v1/explain", body);
  }
}

export type ConvexOperation =
  | "intents.get"
  | "intents.listMine"
  | "positions.get"
  | "positions.listMine"
  | "positions.graph"
  | "positions.timeline"
  | "executions.getByKey"
  | "executions.listByPosition"
  | "executions.listMine"
  | "crossChainMessages.get"
  | "crossChainMessages.listMine"
  | "crossChainMessages.listRecoveryRequired"
  | "marketObservations.latest"
  | "solvers.list";
export type ConvexTransport = <TResponse>(
  operation: ConvexOperation,
  input: Record<string, unknown>,
) => Promise<TResponse>;

export class MetronConvexClient {
  constructor(private readonly transport: ConvexTransport) {}

  getIntent<TResponse>(intentId: string): Promise<TResponse> {
    return this.transport("intents.get", { intentId });
  }

  listIntents<TResponse>(): Promise<TResponse> {
    return this.transport("intents.listMine", {});
  }

  getPosition<TResponse>(positionId: PositionId): Promise<TResponse> {
    return this.transport("positions.get", { positionId });
  }

  listPositions<TResponse>(): Promise<TResponse> {
    return this.transport("positions.listMine", {});
  }

  getPositionTimeline<TResponse>(positionId: PositionId, limit?: number): Promise<TResponse> {
    return this.transport("positions.timeline", {
      positionId,
      ...(limit === undefined ? {} : { limit }),
    });
  }

  getPortfolioGraph(positionId: PositionId): Promise<PortfolioGraph | null> {
    return this.transport<PortfolioGraph | null>("positions.graph", { positionId });
  }

  getActivity(
    positionId: PositionId,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<{ page: AuditEvent[]; isDone: boolean; continueCursor: string }> {
    return this.transport("positions.timeline", { positionId, ...options });
  }

  getExecution(executionKey: string): Promise<ExecutionRecord | null> {
    return this.transport("executions.getByKey", { executionKey });
  }

  listExecutions(
    positionId: PositionId,
    options: { status?: ExecutionStatus; limit?: number; cursor?: string } = {},
  ): Promise<{ page: ExecutionRecord[]; isDone: boolean; continueCursor: string } | null> {
    return this.transport("executions.listByPosition", { positionId, ...options });
  }

  listMyExecutions(
    options: { status?: ExecutionStatus; limit?: number; cursor?: string } = {},
  ): Promise<{ page: ExecutionRecord[]; isDone: boolean; continueCursor: string }> {
    return this.transport("executions.listMine", options);
  }

  getCrossChainMessage(messageId: string): Promise<CrossChainMessage | null> {
    return this.transport("crossChainMessages.get", { messageId });
  }

  listCrossChainMessages(limit?: number): Promise<CrossChainMessage[]> {
    return this.transport("crossChainMessages.listMine", { ...(limit === undefined ? {} : { limit }) });
  }

  listRecoveryMessages(limit?: number): Promise<CrossChainMessage[]> {
    return this.transport("crossChainMessages.listRecoveryRequired", {
      ...(limit === undefined ? {} : { limit }),
    });
  }

  latestMarketObservations(
    chainId: number,
    protocol: string,
    metric: string,
    limit?: number,
  ): Promise<MarketObservation[]> {
    return this.transport("marketObservations.latest", {
      chainId,
      protocol,
      metric,
      ...(limit === undefined ? {} : { limit }),
    });
  }

  listSolvers<TResponse>(): Promise<TResponse> {
    return this.transport("solvers.list", {});
  }

  trace<TResponse>(traceId: TraceId, operation: ConvexOperation): Promise<TResponse> {
    return this.transport(operation, { traceId });
  }
}
