import { getMockStore } from "@/infrastructure/config/mockStore";

import type {
  SyncedEventRecord,
  SyncEventRepository,
} from "../../domain/repositories/SyncEventRepository";

export class InMemorySyncEventRepository implements SyncEventRepository {
  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<SyncedEventRecord | null> {
    return getMockStore().syncedEventsByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  async saveSyncedEvent(record: SyncedEventRecord): Promise<void> {
    getMockStore().syncedEventsByIdempotencyKey.set(record.idempotencyKey, record);
  }
}
