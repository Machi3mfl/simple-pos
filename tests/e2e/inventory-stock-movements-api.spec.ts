import { expect, test } from "./support/test";
import { z } from "zod";

import { listStockMovementsResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/list-stock-movements-response.dto";
import { stockMovementResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/stock-movement-response.dto";

const apiErrorResponseSchema = z
  .object({
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
  })
  .strict();

function uniqueProductId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("inventory stock movements api", () => {
  test("updates weighted-average cost basis and exposes auditable movement history", async ({
    request,
  }) => {
    const productId = uniqueProductId("inv-weighted-avg");

    const inboundOne = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "inbound",
        quantity: 10,
        unitCost: 100,
        reason: "initial_load",
      },
    });

    expect(inboundOne.status()).toBe(201);
    const inboundOneBody = await inboundOne.json();
    const inboundOneParsed = stockMovementResponseDTOSchema.safeParse(inboundOneBody);
    expect(inboundOneParsed.success).toBe(true);

    if (!inboundOneParsed.success) {
      throw new Error("Expected valid stock movement response for inbound one");
    }

    expect(inboundOneParsed.data.weightedAverageUnitCostAfter).toBe(100);
    expect(inboundOneParsed.data.stockOnHandAfter).toBe(10);

    const inboundTwo = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "inbound",
        quantity: 10,
        unitCost: 200,
        reason: "price_update_batch",
      },
    });

    expect(inboundTwo.status()).toBe(201);
    const inboundTwoBody = await inboundTwo.json();
    const inboundTwoParsed = stockMovementResponseDTOSchema.safeParse(inboundTwoBody);
    expect(inboundTwoParsed.success).toBe(true);

    if (!inboundTwoParsed.success) {
      throw new Error("Expected valid stock movement response for inbound two");
    }

    expect(inboundTwoParsed.data.weightedAverageUnitCostAfter).toBe(150);
    expect(inboundTwoParsed.data.stockOnHandAfter).toBe(20);

    const outbound = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "outbound",
        quantity: 5,
        reason: "sale_checkout",
      },
    });

    expect(outbound.status()).toBe(201);
    const outboundBody = await outbound.json();
    const outboundParsed = stockMovementResponseDTOSchema.safeParse(outboundBody);
    expect(outboundParsed.success).toBe(true);

    if (!outboundParsed.success) {
      throw new Error("Expected valid stock movement response for outbound");
    }

    expect(outboundParsed.data.unitCost).toBe(150);
    expect(outboundParsed.data.weightedAverageUnitCostAfter).toBe(150);
    expect(outboundParsed.data.stockOnHandAfter).toBe(15);
    expect(outboundParsed.data.inventoryValueAfter).toBe(2250);

    const allMovementsResponse = await request.get(
      `/api/v1/stock-movements?productId=${productId}`,
    );
    expect(allMovementsResponse.status()).toBe(200);
    const allMovementsBody = await allMovementsResponse.json();
    const allMovementsParsed =
      listStockMovementsResponseDTOSchema.safeParse(allMovementsBody);
    expect(allMovementsParsed.success).toBe(true);

    if (!allMovementsParsed.success) {
      throw new Error("Expected valid stock movement history response");
    }

    expect(allMovementsParsed.data.items.length).toBe(3);
    expect(
      allMovementsParsed.data.items.every((movement) => movement.productId === productId),
    ).toBe(true);

    const inboundOnlyResponse = await request.get(
      `/api/v1/stock-movements?productId=${productId}&movementType=inbound`,
    );
    expect(inboundOnlyResponse.status()).toBe(200);
    const inboundOnlyBody = await inboundOnlyResponse.json();
    const inboundOnlyParsed =
      listStockMovementsResponseDTOSchema.safeParse(inboundOnlyBody);
    expect(inboundOnlyParsed.success).toBe(true);

    if (!inboundOnlyParsed.success) {
      throw new Error("Expected valid inbound-only history response");
    }

    expect(inboundOnlyParsed.data.items.length).toBe(2);
    expect(
      inboundOnlyParsed.data.items.every((movement) => movement.movementType === "inbound"),
    ).toBe(true);
  });

  test("rejects invalid inbound and outbound stock rules", async ({ request }) => {
    const invalidInbound = await request.post("/api/v1/stock-movements", {
      data: {
        productId: uniqueProductId("inv-invalid"),
        movementType: "inbound",
        quantity: 3,
      },
    });

    expect(invalidInbound.status()).toBe(400);
    const invalidInboundBody = await invalidInbound.json();
    expect(apiErrorResponseSchema.safeParse(invalidInboundBody).success).toBe(true);

    const insufficientStock = await request.post("/api/v1/stock-movements", {
      data: {
        productId: uniqueProductId("inv-insufficient"),
        movementType: "outbound",
        quantity: 1,
      },
    });

    expect(insufficientStock.status()).toBe(400);
    const insufficientStockBody = await insufficientStock.json();
    const parsedError = apiErrorResponseSchema.safeParse(insufficientStockBody);
    expect(parsedError.success).toBe(true);

    if (!parsedError.success) {
      throw new Error("Expected error response shape for insufficient stock");
    }

    expect(parsedError.data.code).toBe("stock_rule_error");
  });

  test("validates history date filters", async ({ request }) => {
    const response = await request.get("/api/v1/stock-movements?dateFrom=not-a-date");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
  });
});
