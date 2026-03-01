import { expect, test } from "@playwright/test";

import { productListResponseDTOSchema, productResponseDTOSchema } from "../../src/modules/catalog/presentation/dtos/product-response.dto";
import { stockMovementResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/stock-movement-response.dto";
import { salesHistoryResponseDTOSchema } from "../../src/modules/reporting/presentation/dtos/sales-history-response.dto";
import { topProductsResponseDTOSchema } from "../../src/modules/reporting/presentation/dtos/top-products-response.dto";
import { saleResponseDTOSchema } from "../../src/modules/sales/presentation/dtos/sale-response.dto";
import { syncEventsResultResponseDTOSchema } from "../../src/modules/sync/presentation/dtos/sync-events-result.dto";

function uniqueMarker(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("release gate real backend", () => {
  test.skip(
    process.env.POS_BACKEND_MODE !== "supabase",
    "Real-backend gate runs only when POS_BACKEND_MODE=supabase.",
  );

  test("persists catalog, stock, sale, and sync flows with reporting visibility", async ({
    request,
  }) => {
    const marker = uniqueMarker("real-gate");
    const productName = `Real Gate Product ${marker}`;

    const createProductResponse = await request.post("/api/v1/products", {
      data: {
        name: productName,
        categoryId: "snack",
        price: 10,
        initialStock: 0,
      },
    });
    expect(createProductResponse.status()).toBe(201);
    const createdProductBody = await createProductResponse.json();
    const createdProduct = productResponseDTOSchema.safeParse(createdProductBody);
    expect(createdProduct.success).toBe(true);
    if (!createdProduct.success) {
      throw new Error("Expected valid product response.");
    }

    const productId = createdProduct.data.item.id;

    const inboundResponse = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "inbound",
        quantity: 5,
        unitCost: 4,
      },
    });
    expect(inboundResponse.status()).toBe(201);
    expect(stockMovementResponseDTOSchema.safeParse(await inboundResponse.json()).success).toBe(
      true,
    );

    const outboundResponse = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "outbound",
        quantity: 2,
      },
    });
    expect(outboundResponse.status()).toBe(201);
    expect(stockMovementResponseDTOSchema.safeParse(await outboundResponse.json()).success).toBe(
      true,
    );

    const saleResponse = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId, quantity: 2 }],
        paymentMethod: "cash",
      },
    });
    expect(saleResponse.status()).toBe(201);
    const saleBody = await saleResponse.json();
    const saleParsed = saleResponseDTOSchema.safeParse(saleBody);
    expect(saleParsed.success).toBe(true);
    if (!saleParsed.success) {
      throw new Error("Expected valid sale response.");
    }

    const listProductsResponse = await request.get("/api/v1/products?activeOnly=true");
    expect(listProductsResponse.status()).toBe(200);
    const listProductsBody = await listProductsResponse.json();
    const listProductsParsed = productListResponseDTOSchema.safeParse(listProductsBody);
    expect(listProductsParsed.success).toBe(true);
    if (!listProductsParsed.success) {
      throw new Error("Expected valid product list response.");
    }
    expect(
      listProductsParsed.data.items.some((product) => product.id === productId),
    ).toBe(true);

    const salesHistoryResponse = await request.get("/api/v1/reports/sales-history");
    expect(salesHistoryResponse.status()).toBe(200);
    const salesHistoryBody = await salesHistoryResponse.json();
    const salesHistoryParsed = salesHistoryResponseDTOSchema.safeParse(salesHistoryBody);
    expect(salesHistoryParsed.success).toBe(true);
    if (!salesHistoryParsed.success) {
      throw new Error("Expected valid sales history report response.");
    }
    expect(
      salesHistoryParsed.data.items.some((item) => item.saleId === saleParsed.data.saleId),
    ).toBe(true);

    const topProductsResponse = await request.get("/api/v1/reports/top-products");
    expect(topProductsResponse.status()).toBe(200);
    const topProductsBody = await topProductsResponse.json();
    const topProductsParsed = topProductsResponseDTOSchema.safeParse(topProductsBody);
    expect(topProductsParsed.success).toBe(true);
    if (!topProductsParsed.success) {
      throw new Error("Expected valid top-products report response.");
    }
    expect(
      topProductsParsed.data.items.some((item) => item.productId === productId),
    ).toBe(true);

    const syncKey = uniqueMarker("real-sync");

    const firstSyncResponse = await request.post("/api/v1/sync/events", {
      data: {
        events: [
          {
            eventId: `evt-${syncKey}-1`,
            eventType: "sale_created",
            occurredAt: new Date().toISOString(),
            payload: { saleId: saleParsed.data.saleId },
            idempotencyKey: syncKey,
          },
        ],
      },
    });
    expect(firstSyncResponse.status()).toBe(200);
    const firstSyncBody = await firstSyncResponse.json();
    const firstSyncParsed = syncEventsResultResponseDTOSchema.safeParse(firstSyncBody);
    expect(firstSyncParsed.success).toBe(true);
    if (!firstSyncParsed.success) {
      throw new Error("Expected valid first sync response.");
    }
    expect(firstSyncParsed.data.results).toEqual([
      {
        eventId: `evt-${syncKey}-1`,
        status: "synced",
      },
    ]);

    const replaySyncResponse = await request.post("/api/v1/sync/events", {
      data: {
        events: [
          {
            eventId: `evt-${syncKey}-2`,
            eventType: "sale_created",
            occurredAt: new Date().toISOString(),
            payload: { saleId: saleParsed.data.saleId },
            idempotencyKey: syncKey,
          },
        ],
      },
    });
    expect(replaySyncResponse.status()).toBe(200);
    const replaySyncBody = await replaySyncResponse.json();
    const replaySyncParsed = syncEventsResultResponseDTOSchema.safeParse(replaySyncBody);
    expect(replaySyncParsed.success).toBe(true);
    if (!replaySyncParsed.success) {
      throw new Error("Expected valid replay sync response.");
    }
    expect(replaySyncParsed.data.results).toEqual([
      {
        eventId: `evt-${syncKey}-2`,
        status: "synced",
        reason: "idempotent_replay",
      },
    ]);
  });
});
