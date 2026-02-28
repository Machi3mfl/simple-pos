import type { SyncEventRepository } from "../../domain/repositories/SyncEventRepository";

export interface ProcessSyncEventInput {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
}

export interface ProcessSyncEventsBatchInput {
  readonly events: readonly ProcessSyncEventInput[];
}

export interface ProcessSyncEventResult {
  readonly eventId: string;
  readonly status: "synced" | "failed";
  readonly reason?: string;
}

const SUPPORTED_EVENT_TYPES = new Set([
  "sale_created",
  "stock_movement_created",
  "debt_payment_registered",
]);

export class ProcessSyncEventsBatchUseCase {
  constructor(private readonly syncEventRepository: SyncEventRepository) {}

  async execute(input: ProcessSyncEventsBatchInput): Promise<readonly ProcessSyncEventResult[]> {
    const results: ProcessSyncEventResult[] = [];
    const seenInBatch = new Set<string>();

    for (const event of input.events) {
      if (seenInBatch.has(event.idempotencyKey)) {
        results.push({
          eventId: event.eventId,
          status: "failed",
          reason: "duplicate_idempotency_key_in_batch",
        });
        continue;
      }
      seenInBatch.add(event.idempotencyKey);

      if (!SUPPORTED_EVENT_TYPES.has(event.eventType)) {
        results.push({
          eventId: event.eventId,
          status: "failed",
          reason: "unsupported_event_type",
        });
        continue;
      }

      const alreadySynced = await this.syncEventRepository.findByIdempotencyKey(
        event.idempotencyKey,
      );
      if (alreadySynced) {
        results.push({
          eventId: event.eventId,
          status: "synced",
          reason: "idempotent_replay",
        });
        continue;
      }

      await this.syncEventRepository.saveSyncedEvent({
        idempotencyKey: event.idempotencyKey,
        eventId: event.eventId,
        eventType: event.eventType,
        processedAt: new Date(),
      });

      results.push({
        eventId: event.eventId,
        status: "synced",
      });
    }

    return results;
  }
}
