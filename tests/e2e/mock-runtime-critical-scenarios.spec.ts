import { expect, test } from "@playwright/test";
import { z } from "zod";

import { stockMovementResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/stock-movement-response.dto";
import { saleResponseDTOSchema } from "../../src/modules/sales/presentation/dtos/sale-response.dto";
import { syncEventsResultResponseDTOSchema } from "../../src/modules/sync/presentation/dtos/sync-events-result.dto";

const apiErrorResponseSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z
    .array(
      z
        .object({
          field: z.string().min(1),
          message: z.string().min(1),
        })
        .strict(),
    )
    .optional(),
}).strict();

test.describe("mock runtime critical scenarios", () => {
  test("covers sales happy path and validation error", async ({ request }) => {
    const successResponse = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId: "product-001", quantity: 2 }],
        paymentMethod: "cash",
      },
    });

    expect(successResponse.status()).toBe(201);
    const successBody = await successResponse.json();
    expect(saleResponseDTOSchema.safeParse(successBody).success).toBe(true);

    const errorResponse = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId: "product-001", quantity: 2 }],
        paymentMethod: "on_account",
      },
    });

    expect(errorResponse.status()).toBe(400);
    const errorBody = await errorResponse.json();
    expect(apiErrorResponseSchema.safeParse(errorBody).success).toBe(true);
  });

  test("covers stock movement happy path and validation error", async ({ request }) => {
    const successResponse = await request.post("/api/v1/stock-movements", {
      data: {
        productId: "product-010",
        movementType: "inbound",
        quantity: 5,
        unitCost: 2500,
      },
    });

    expect(successResponse.status()).toBe(201);
    const successBody = await successResponse.json();
    expect(stockMovementResponseDTOSchema.safeParse(successBody).success).toBe(true);

    const errorResponse = await request.post("/api/v1/stock-movements", {
      data: {
        productId: "product-010",
        movementType: "inbound",
        quantity: 5,
      },
    });

    expect(errorResponse.status()).toBe(400);
    const errorBody = await errorResponse.json();
    expect(apiErrorResponseSchema.safeParse(errorBody).success).toBe(true);
  });

  test("covers sync happy path and failed event handling", async ({ request }) => {
    const successWithFailuresResponse = await request.post("/api/v1/sync/events", {
      data: {
        events: [
          {
            eventId: "evt-1",
            eventType: "sale_created",
            occurredAt: "2026-02-27T12:00:00.000Z",
            payload: { saleId: "sale-1" },
            idempotencyKey: "idem-1",
          },
          {
            eventId: "evt-2",
            eventType: "unknown_event",
            occurredAt: "2026-02-27T12:00:01.000Z",
            payload: { ref: "x" },
            idempotencyKey: "idem-2",
          },
          {
            eventId: "evt-3",
            eventType: "stock_movement_created",
            occurredAt: "2026-02-27T12:00:02.000Z",
            payload: { movementId: "mov-1" },
            idempotencyKey: "idem-1",
          },
        ],
      },
    });

    expect(successWithFailuresResponse.status()).toBe(200);
    const resultBody = await successWithFailuresResponse.json();
    const parsed = syncEventsResultResponseDTOSchema.safeParse(resultBody);
    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw new Error("Expected valid sync events result payload");
    }

    expect(parsed.data.results).toEqual([
      { eventId: "evt-1", status: "synced" },
      {
        eventId: "evt-2",
        status: "failed",
        reason: "unsupported_event_type",
      },
      {
        eventId: "evt-3",
        status: "failed",
        reason: "duplicate_idempotency_key_in_batch",
      },
    ]);

    const invalidPayloadResponse = await request.post("/api/v1/sync/events", {
      data: { events: [] },
    });

    expect(invalidPayloadResponse.status()).toBe(400);
    const errorBody = await invalidPayloadResponse.json();
    expect(apiErrorResponseSchema.safeParse(errorBody).success).toBe(true);
  });
});
