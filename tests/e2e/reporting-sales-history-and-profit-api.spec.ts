import { expect, test } from "@playwright/test";
import { z } from "zod";

import { productResponseDTOSchema } from "../../src/modules/catalog/presentation/dtos/product-response.dto";
import { stockMovementResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/stock-movement-response.dto";
import { profitSummaryResponseDTOSchema } from "../../src/modules/reporting/presentation/dtos/profit-summary-response.dto";
import { salesHistoryResponseDTOSchema } from "../../src/modules/reporting/presentation/dtos/sales-history-response.dto";
import { topProductsResponseDTOSchema } from "../../src/modules/reporting/presentation/dtos/top-products-response.dto";
import { saleResponseDTOSchema } from "../../src/modules/sales/presentation/dtos/sale-response.dto";

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

function uniqueMarker(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("reporting api", () => {
  test("returns top products and sales history filtered by payment method", async ({
    request,
  }) => {
    const marker = uniqueMarker("reporting-products");
    const periodStart = new Date(Date.now() - 60_000).toISOString();

    const firstProductResponse = await request.post("/api/v1/products", {
      data: {
        name: `Report Product A ${marker}`,
        categoryId: "snack",
        price: 10,
        cost: 4,
        initialStock: 30,
      },
    });
    expect(firstProductResponse.status()).toBe(201);
    const firstProductBody = await firstProductResponse.json();
    const firstProductParsed = productResponseDTOSchema.safeParse(firstProductBody);
    expect(firstProductParsed.success).toBe(true);
    if (!firstProductParsed.success) {
      throw new Error("Expected valid product response for first reporting product");
    }

    const secondProductResponse = await request.post("/api/v1/products", {
      data: {
        name: `Report Product B ${marker}`,
        categoryId: "drink",
        price: 10,
        cost: 4,
        initialStock: 20,
      },
    });
    expect(secondProductResponse.status()).toBe(201);
    const secondProductBody = await secondProductResponse.json();
    const secondProductParsed = productResponseDTOSchema.safeParse(secondProductBody);
    expect(secondProductParsed.success).toBe(true);
    if (!secondProductParsed.success) {
      throw new Error("Expected valid product response for second reporting product");
    }

    const productAId = firstProductParsed.data.item.id;
    const productBId = secondProductParsed.data.item.id;

    const cashSaleResponse = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId: productAId, quantity: 3 }],
        paymentMethod: "cash",
      },
    });
    expect(cashSaleResponse.status()).toBe(201);
    const cashSaleBody = await cashSaleResponse.json();
    const cashSaleParsed = saleResponseDTOSchema.safeParse(cashSaleBody);
    expect(cashSaleParsed.success).toBe(true);
    if (!cashSaleParsed.success) {
      throw new Error("Expected valid cash sale response");
    }

    const onAccountSaleResponse = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId: productBId, quantity: 1 }],
        paymentMethod: "on_account",
        customerName: `Cliente Reporting ${marker}`,
      },
    });
    expect(onAccountSaleResponse.status()).toBe(201);
    const onAccountSaleBody = await onAccountSaleResponse.json();
    const onAccountSaleParsed = saleResponseDTOSchema.safeParse(onAccountSaleBody);
    expect(onAccountSaleParsed.success).toBe(true);
    if (!onAccountSaleParsed.success) {
      throw new Error("Expected valid on-account sale response");
    }

    const periodEnd = new Date(Date.now() + 60_000).toISOString();

    const topProductsResponse = await request.get(
      `/api/v1/reports/top-products?periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}`,
    );
    expect(topProductsResponse.status()).toBe(200);
    const topProductsBody = await topProductsResponse.json();
    const topProductsParsed = topProductsResponseDTOSchema.safeParse(topProductsBody);
    expect(topProductsParsed.success).toBe(true);
    if (!topProductsParsed.success) {
      throw new Error("Expected valid top-products report response");
    }

    const productASummary = topProductsParsed.data.items.find(
      (item) => item.productId === productAId,
    );
    const productBSummary = topProductsParsed.data.items.find(
      (item) => item.productId === productBId,
    );

    expect(productASummary).toBeDefined();
    expect(productBSummary).toBeDefined();
    expect(productASummary?.quantitySold).toBe(3);
    expect(productASummary?.revenue).toBe(30);
    expect(productBSummary?.quantitySold).toBe(1);
    expect(productBSummary?.revenue).toBe(10);

    const salesHistoryResponse = await request.get(
      `/api/v1/reports/sales-history?periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}&paymentMethod=on_account`,
    );
    expect(salesHistoryResponse.status()).toBe(200);
    const salesHistoryBody = await salesHistoryResponse.json();
    const salesHistoryParsed = salesHistoryResponseDTOSchema.safeParse(salesHistoryBody);
    expect(salesHistoryParsed.success).toBe(true);
    if (!salesHistoryParsed.success) {
      throw new Error("Expected valid sales-history report response");
    }

    expect(
      salesHistoryParsed.data.items.some(
        (item) => item.saleId === onAccountSaleParsed.data.saleId,
      ),
    ).toBe(true);
    expect(
      salesHistoryParsed.data.items.every((item) => item.paymentMethod === "on_account"),
    ).toBe(true);
    expect(
      salesHistoryParsed.data.items.some((item) => item.saleId === cashSaleParsed.data.saleId),
    ).toBe(false);
  });

  test("computes profit summary deltas and validates reporting query params", async ({
    request,
  }) => {
    const beforeResponse = await request.get("/api/v1/reports/profit-summary");
    expect(beforeResponse.status()).toBe(200);
    const beforeBody = await beforeResponse.json();
    const beforeParsed = profitSummaryResponseDTOSchema.safeParse(beforeBody);
    expect(beforeParsed.success).toBe(true);
    if (!beforeParsed.success) {
      throw new Error("Expected valid baseline profit summary");
    }

    const marker = uniqueMarker("reporting-profit");

    const createProductResponse = await request.post("/api/v1/products", {
      data: {
        name: `Report Profit Product ${marker}`,
        categoryId: "snack",
        price: 10,
        initialStock: 0,
      },
    });
    expect(createProductResponse.status()).toBe(201);
    const createProductBody = await createProductResponse.json();
    const createProductParsed = productResponseDTOSchema.safeParse(createProductBody);
    expect(createProductParsed.success).toBe(true);
    if (!createProductParsed.success) {
      throw new Error("Expected valid product response for profit flow");
    }

    const productId = createProductParsed.data.item.id;

    const inboundOne = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "inbound",
        quantity: 10,
        unitCost: 4,
      },
    });
    expect(inboundOne.status()).toBe(201);
    expect(stockMovementResponseDTOSchema.safeParse(await inboundOne.json()).success).toBe(
      true,
    );

    const inboundTwo = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "inbound",
        quantity: 10,
        unitCost: 6,
      },
    });
    expect(inboundTwo.status()).toBe(201);
    expect(stockMovementResponseDTOSchema.safeParse(await inboundTwo.json()).success).toBe(
      true,
    );

    const outbound = await request.post("/api/v1/stock-movements", {
      data: {
        productId,
        movementType: "outbound",
        quantity: 8,
      },
    });
    expect(outbound.status()).toBe(201);
    const outboundBody = await outbound.json();
    const outboundParsed = stockMovementResponseDTOSchema.safeParse(outboundBody);
    expect(outboundParsed.success).toBe(true);
    if (!outboundParsed.success) {
      throw new Error("Expected valid outbound stock movement response");
    }
    expect(outboundParsed.data.unitCost).toBe(5);

    const saleResponse = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId, quantity: 8 }],
        paymentMethod: "cash",
      },
    });
    expect(saleResponse.status()).toBe(201);
    const saleBody = await saleResponse.json();
    const saleParsed = saleResponseDTOSchema.safeParse(saleBody);
    expect(saleParsed.success).toBe(true);
    if (!saleParsed.success) {
      throw new Error("Expected valid sale response for profit flow");
    }
    expect(saleParsed.data.total).toBe(80);

    const afterResponse = await request.get("/api/v1/reports/profit-summary");
    expect(afterResponse.status()).toBe(200);
    const afterBody = await afterResponse.json();
    const afterParsed = profitSummaryResponseDTOSchema.safeParse(afterBody);
    expect(afterParsed.success).toBe(true);
    if (!afterParsed.success) {
      throw new Error("Expected valid profit summary after operations");
    }

    const revenueDelta = Number(
      (afterParsed.data.revenue - beforeParsed.data.revenue).toFixed(2),
    );
    const costDelta = Number((afterParsed.data.cost - beforeParsed.data.cost).toFixed(2));
    const profitDelta = Number(
      (afterParsed.data.profit - beforeParsed.data.profit).toFixed(2),
    );

    expect(revenueDelta).toBeGreaterThanOrEqual(80);
    expect(costDelta).toBeGreaterThanOrEqual(40);
    expect(profitDelta).toBeCloseTo(revenueDelta - costDelta, 2);

    const invalidHistoryFilter = await request.get(
      "/api/v1/reports/sales-history?paymentMethod=card",
    );
    expect(invalidHistoryFilter.status()).toBe(400);
    expect(
      apiErrorResponseSchema.safeParse(await invalidHistoryFilter.json()).success,
    ).toBe(true);

    const invalidDateResponse = await request.get(
      "/api/v1/reports/top-products?periodStart=not-a-date",
    );
    expect(invalidDateResponse.status()).toBe(400);
    expect(apiErrorResponseSchema.safeParse(await invalidDateResponse.json()).success).toBe(
      true,
    );

    const invalidRangeResponse = await request.get(
      "/api/v1/reports/profit-summary?periodStart=2026-02-28&periodEnd=2026-02-01",
    );
    expect(invalidRangeResponse.status()).toBe(400);
    expect(apiErrorResponseSchema.safeParse(await invalidRangeResponse.json()).success).toBe(
      true,
    );
  });
});
