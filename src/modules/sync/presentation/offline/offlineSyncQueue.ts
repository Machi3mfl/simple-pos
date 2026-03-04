"use client";

const OFFLINE_SYNC_QUEUE_KEY = "simple_pos_offline_sync_queue";

export type OfflineSyncEventStatus = "pending_sync" | "synced" | "failed";

export interface OfflineSyncQueueEvent {
  readonly localEventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
  readonly status: OfflineSyncEventStatus;
  readonly retryCount: number;
  readonly lastError?: string;
}

interface EnqueueOfflineSyncEventInput {
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey?: string;
}

interface SyncApiResult {
  readonly eventId: string;
  readonly status: "synced" | "failed";
  readonly reason?: string;
}

interface SyncApiResponse {
  readonly results: readonly SyncApiResult[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readQueue(): OfflineSyncQueueEvent[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
    if (!rawValue) {
      return [];
    }
    const parsed = JSON.parse(rawValue) as OfflineSyncQueueEvent[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function writeQueue(queue: readonly OfflineSyncQueueEvent[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueOfflineSyncEvent(
  input: EnqueueOfflineSyncEventInput,
): OfflineSyncQueueEvent {
  const queue = readQueue();
  const localEventId = crypto.randomUUID();
  const event: OfflineSyncQueueEvent = {
    localEventId,
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    payload: input.payload,
    idempotencyKey: input.idempotencyKey ?? `offline-${localEventId}`,
    status: "pending_sync",
    retryCount: 0,
  };
  writeQueue([...queue, event]);
  return event;
}

export function getPendingOfflineSyncCount(
  eventTypes?: readonly string[],
): number {
  const eventTypeFilter = eventTypes ? new Set(eventTypes) : null;
  return readQueue().filter((event) => {
    if (event.status === "synced") {
      return false;
    }

    if (!eventTypeFilter) {
      return true;
    }

    return eventTypeFilter.has(event.eventType);
  }).length;
}

export async function flushOfflineSyncQueue(): Promise<{
  readonly synced: number;
  readonly failed: number;
  readonly pending: number;
}> {
  const queue = readQueue();
  const pendingEvents = queue.filter((event) => event.status !== "synced");

  if (pendingEvents.length === 0) {
    return { synced: 0, failed: 0, pending: 0 };
  }

  try {
    const response = await fetch("/api/v1/sync/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        events: pendingEvents.map((event) => ({
          eventId: event.localEventId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
          payload: event.payload,
          idempotencyKey: event.idempotencyKey,
        })),
      }),
    });

    if (!response.ok) {
      const nextQueue = queue.map((event) => {
        if (event.status === "synced") {
          return event;
        }

        return {
          ...event,
          status: "failed" as const,
          retryCount: event.retryCount + 1,
          lastError: `sync_http_${response.status}`,
        };
      });
      writeQueue(nextQueue);
      const pending = nextQueue.filter((event) => event.status !== "synced").length;
      const failed = nextQueue.filter((event) => event.status === "failed").length;
      return { synced: 0, failed, pending };
    }

    const body = (await response.json()) as SyncApiResponse;
    const resultByEventId = new Map(body.results.map((result) => [result.eventId, result]));

    const nextQueue = queue.map((event) => {
      const result = resultByEventId.get(event.localEventId);
      if (!result) {
        return event;
      }

      if (result.status === "synced") {
        return {
          ...event,
          status: "synced" as const,
          retryCount: event.retryCount + 1,
          lastError: undefined,
        };
      }

      return {
        ...event,
        status: "failed" as const,
        retryCount: event.retryCount + 1,
        lastError: result.reason ?? "sync_failed",
      };
    });

    writeQueue(nextQueue);

    const synced = nextQueue.filter((event) => event.status === "synced").length;
    const failed = nextQueue.filter((event) => event.status === "failed").length;
    const pending = nextQueue.filter((event) => event.status === "pending_sync").length;
    return { synced, failed, pending };
  } catch {
    const nextQueue = queue.map((event) => {
      if (event.status === "synced") {
        return event;
      }

      return {
        ...event,
        status: "failed" as const,
        retryCount: event.retryCount + 1,
        lastError: "network_error",
      };
    });

    writeQueue(nextQueue);

    const failed = nextQueue.filter((event) => event.status === "failed").length;
    const pending = nextQueue.filter((event) => event.status === "pending_sync").length;
    return { synced: 0, failed, pending };
  }
}

export function getOfflineSyncQueueStorageKey(): string {
  return OFFLINE_SYNC_QUEUE_KEY;
}
