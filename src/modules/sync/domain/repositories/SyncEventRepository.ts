export interface SyncedEventRecord {
  readonly idempotencyKey: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly processedAt: Date;
}

export interface SyncEventRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<SyncedEventRecord | null>;
  saveSyncedEvent(record: SyncedEventRecord): Promise<void>;
}
