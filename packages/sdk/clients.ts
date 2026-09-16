import type { PositionId, TraceId } from "@metron/types";

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
  "intents.get" | "intents.listMine" | "positions.get" | "positions.listMine" | "solvers.list";
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

  listSolvers<TResponse>(): Promise<TResponse> {
    return this.transport("solvers.list", {});
  }

  trace<TResponse>(traceId: TraceId, operation: ConvexOperation): Promise<TResponse> {
    return this.transport(operation, { traceId });
  }
}
