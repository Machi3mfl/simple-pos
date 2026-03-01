import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  SyncedEventRecord,
  SyncEventRepository,
} from "../../domain/repositories/SyncEventRepository";

interface SyncEventRow {
  idempotency_key: string;
  event_id: string;
  event_type: string;
  processed_at: string;
}

function mapRowToDomain(row: SyncEventRow): SyncedEventRecord {
  return {
    idempotencyKey: row.idempotency_key,
    eventId: row.event_id,
    eventType: row.event_type,
    processedAt: new Date(row.processed_at),
  };
}

export class SupabaseSyncEventRepository implements SyncEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<SyncedEventRecord | null> {
    const { data, error } = await this.client
      .from("sync_events")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read sync event from Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToDomain(data as SyncEventRow);
  }

  async saveSyncedEvent(record: SyncedEventRecord): Promise<void> {
    const { error } = await this.client.from("sync_events").upsert(
      {
        idempotency_key: record.idempotencyKey,
        event_id: record.eventId,
        event_type: record.eventType,
        processed_at: record.processedAt.toISOString(),
      },
      { onConflict: "idempotency_key" },
    );

    if (error) {
      throw new Error(`Failed to save sync event in Supabase: ${error.message}`);
    }
  }
}
