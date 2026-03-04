import { expect, test } from "./support/test";

import { syncEventsResultResponseDTOSchema } from "../../src/modules/sync/presentation/dtos/sync-events-result.dto";

test.describe("sync idempotency and retry api", () => {
  test("processes supported events and handles idempotent replay safely", async ({
    request,
  }) => {
    const idempotencyKey = `sync-key-${Date.now()}-1`;

    const firstSync = await request.post("/api/v1/sync/events", {
      data: {
        events: [
          {
            eventId: "evt-first",
            eventType: "sale_created",
            occurredAt: "2026-02-27T12:00:00.000Z",
            payload: { saleId: "sale-001" },
            idempotencyKey,
          },
        ],
      },
    });
    expect(firstSync.status()).toBe(200);
    const firstBody = await firstSync.json();
    const firstParsed = syncEventsResultResponseDTOSchema.safeParse(firstBody);
    expect(firstParsed.success).toBe(true);
    if (!firstParsed.success) {
      throw new Error("Expected valid first sync response");
    }

    expect(firstParsed.data.results).toEqual([
      {
        eventId: "evt-first",
        status: "synced",
      },
    ]);

    const replaySync = await request.post("/api/v1/sync/events", {
      data: {
        events: [
          {
            eventId: "evt-replay",
            eventType: "sale_created",
            occurredAt: "2026-02-27T12:01:00.000Z",
            payload: { saleId: "sale-001" },
            idempotencyKey,
          },
        ],
      },
    });
    expect(replaySync.status()).toBe(200);
    const replayBody = await replaySync.json();
    const replayParsed = syncEventsResultResponseDTOSchema.safeParse(replayBody);
    expect(replayParsed.success).toBe(true);
    if (!replayParsed.success) {
      throw new Error("Expected valid replay sync response");
    }

    expect(replayParsed.data.results).toEqual([
      {
        eventId: "evt-replay",
        status: "synced",
        reason: "idempotent_replay",
      },
    ]);
  });

  test("keeps unsupported or duplicate-in-batch events as failed and retryable", async ({
    request,
  }) => {
    const duplicateKey = `sync-key-${Date.now()}-dup`;

    const response = await request.post("/api/v1/sync/events", {
      data: {
        events: [
          {
            eventId: "evt-supported",
            eventType: "debt_payment_registered",
            occurredAt: "2026-02-27T12:05:00.000Z",
            payload: { paymentId: "pay-001" },
            idempotencyKey: duplicateKey,
          },
          {
            eventId: "evt-unsupported",
            eventType: "unknown_type",
            occurredAt: "2026-02-27T12:05:05.000Z",
            payload: {},
            idempotencyKey: `sync-key-${Date.now()}-unsupported`,
          },
          {
            eventId: "evt-duplicate-batch",
            eventType: "sale_created",
            occurredAt: "2026-02-27T12:05:10.000Z",
            payload: { saleId: "sale-002" },
            idempotencyKey: duplicateKey,
          },
        ],
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const parsed = syncEventsResultResponseDTOSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error("Expected valid sync response");
    }

    expect(parsed.data.results).toEqual([
      {
        eventId: "evt-supported",
        status: "synced",
      },
      {
        eventId: "evt-unsupported",
        status: "failed",
        reason: "unsupported_event_type",
      },
      {
        eventId: "evt-duplicate-batch",
        status: "failed",
        reason: "duplicate_idempotency_key_in_batch",
      },
    ]);
  });
});
