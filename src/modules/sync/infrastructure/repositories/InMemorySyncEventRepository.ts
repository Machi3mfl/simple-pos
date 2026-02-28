import type {
  SyncedEventRecord,
  SyncEventRepository,
} from "../../domain/repositories/SyncEventRepository";

export class InMemorySyncEventRepository implements SyncEventRepository {
  private static readonly syncedByIdempotencyKey = new Map<string, SyncedEventRecord>();

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<SyncedEventRecord | null> {
    return InMemorySyncEventRepository.syncedByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  async saveSyncedEvent(record: SyncedEventRecord): Promise<void> {
    InMemorySyncEventRepository.syncedByIdempotencyKey.set(record.idempotencyKey, record);
  }
}
