export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type McpServiceConfig = {
  aiBaseUrl?: string | undefined;
  aiServiceToken?: string | undefined;
  convexUrl?: string | undefined;
  convexInternalToken?: string | undefined;
  executionGatewayUrl?: string | undefined;
  executionGatewayToken?: string | undefined;
  timeoutMs?: number | undefined;
  fetcher?: typeof fetch | undefined;
};

export type ExecutionRequest = {
  approval_id: string;
  intent_id: string;
  position_id: string;
  trace_id: string;
  deadline: number;
  actions: Array<{
    action_type: string;
    chain_id: number;
    protocol: string;
    asset: string;
    amount: string;
    minimum_output?: string | undefined;
  }>;
};
export class MetronServiceError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MetronServiceError";
  }
}

export class MetronServices {
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  public constructor(private readonly config: McpServiceConfig = {}) {
    this.fetcher = config.fetcher ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  public async ai<TResponse>(
    path: string,
    body: JsonValue | Record<string, unknown>,
  ): Promise<TResponse> {
    if (!this.config.aiBaseUrl || !this.config.aiServiceToken) {
      throw new MetronServiceError(
        "AI service is not configured; set METRON_AI_BASE_URL and METRON_AI_SERVICE_TOKEN",
        503,
      );
    }
    return this.request<TResponse>(
      new URL(path, ensureTrailingSlash(this.config.aiBaseUrl)).toString(),
      body,
      {
        "x-metron-service-token": this.config.aiServiceToken,
      },
    );
  }

  public async convex<TResponse>(
    operation: string,
    args: Record<string, JsonValue>,
  ): Promise<TResponse> {
    if (!this.config.convexUrl || !this.config.convexInternalToken) {
      throw new MetronServiceError(
        "Convex service is not configured; set METRON_CONVEX_URL and METRON_INTERNAL_TOKEN",
        503,
      );
    }
    return this.request<TResponse>(
      new URL("api/query", ensureTrailingSlash(this.config.convexUrl)).toString(),
      {
        path: operation,
        args,
        format: "json",
      },
      {
        "x-metron-internal-token": this.config.convexInternalToken,
      },
    );
  }

  public async execute<TResponse>(body: ExecutionRequest): Promise<TResponse> {
    if (!this.config.executionGatewayUrl || !this.config.executionGatewayToken) {
      throw new MetronServiceError(
        "execution gateway is not configured; set METRON_EXECUTION_GATEWAY_URL and METRON_EXECUTION_GATEWAY_TOKEN",
        503,
      );
    }
    return this.request<TResponse>(
      new URL("v1/executions", ensureTrailingSlash(this.config.executionGatewayUrl)).toString(),
      body,
      { authorization: `Bearer ${this.config.executionGatewayToken}` },
    );
  }

  private async request<TResponse>(
    url: string,
    body: JsonValue | Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(url, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new MetronServiceError(
          `upstream request failed with status ${response.status}`,
          response.status,
        );
      }
      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof MetronServiceError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new MetronServiceError(
          "upstream request timed out; retry with a narrower request",
          504,
        );
      }
      throw new MetronServiceError("upstream request failed", 502);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
