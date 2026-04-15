import type { CapabilityResultEnvelope } from "@/core/entities/capability-result";
import type { MediaCompositionPlan } from "@/core/entities/media-composition";

export interface MediaWorkerClientConfig {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  sharedSecret?: string;
}

export interface ExecuteComposeMediaJobRequest {
  plan: MediaCompositionPlan;
  userId: string;
  conversationId: string | null;
}

function resolveBaseUrl(): string {
  const configured = process.env.MEDIA_WORKER_URL?.trim();
  return configured && configured.length > 0 ? configured : "http://127.0.0.1:3101";
}

export class MediaWorkerClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly sharedSecret?: string;

  constructor(config: MediaWorkerClientConfig = {}) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.baseUrl = config.baseUrl ?? resolveBaseUrl();
    this.sharedSecret = config.sharedSecret ?? process.env.MEDIA_WORKER_SHARED_SECRET;
  }

  async executeComposeMediaJob(
    request: ExecuteComposeMediaJobRequest,
  ): Promise<CapabilityResultEnvelope> {
    const response = await this.fetchImpl(`${this.baseUrl}/compose-media`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.sharedSecret ? { authorization: `Bearer ${this.sharedSecret}` } : {}),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Media worker request failed with ${response.status}: ${await response.text()}`);
    }

    return await response.json() as CapabilityResultEnvelope;
  }
}
