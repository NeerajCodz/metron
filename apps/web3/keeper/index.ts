import type { PositionId } from "@metron/types";

import {
  evaluateKeeperObservation,
  KeeperIdempotency,
  type KeeperObservation,
  type KeeperTrigger,
} from "./monitor.js";

export interface KeeperActionRequest {
  key: string;
  positionId: PositionId;
  kind: KeeperTrigger["kind"];
  reason: string;
}

export type KeeperSubmit = (request: KeeperActionRequest) => Promise<void>;

export interface KeeperGatewayConfig {
  endpoint: string;
  token: string;
  fetcher?: typeof fetch;
}

export function createKeeperGatewaySubmit(config: KeeperGatewayConfig): KeeperSubmit {
  const fetcher = config.fetcher ?? fetch;
  return async (request) => {
    const response = await fetcher(config.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${config.token}`,
        "idempotency-key": request.key,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok)
      throw new Error(`keeper gateway rejected request with status ${response.status}`);
  };
}

export class KeeperRuntime {
  private readonly idempotency = new KeeperIdempotency();

  async runCycle(
    observations: readonly KeeperObservation[],
    submit: KeeperSubmit,
  ): Promise<KeeperTrigger[]> {
    const triggers = this.idempotency.filterNew(observations.flatMap(evaluateKeeperObservation));
    const submitted: KeeperTrigger[] = [];
    for (const trigger of triggers) {
      try {
        await submit({
          key: trigger.key,
          positionId: trigger.positionId,
          kind: trigger.kind,
          reason: trigger.reason,
        });
        this.idempotency.markSubmitted(trigger);
        submitted.push(trigger);
      } catch (error) {
        this.idempotency.forget([trigger]);
        throw error;
      }
    }
    return submitted;
  }
}

export { evaluateKeeperObservation, KeeperIdempotency } from "./monitor.js";
export type { KeeperObservation, KeeperTrigger } from "./monitor.js";
