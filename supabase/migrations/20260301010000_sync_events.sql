-- Sync event persistence for offline idempotency replay tracking.

create table if not exists sync_events (
  idempotency_key text primary key,
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null
);

create index if not exists idx_sync_events_processed_at
  on sync_events (processed_at desc);
