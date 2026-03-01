import { expect, test, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

import {
  bulkPriceUpdateResponseDTOSchema,
} from "../../src/modules/catalog/presentation/dtos/bulk-price-update.dto";
import { productListResponseDTOSchema } from "../../src/modules/catalog/presentation/dtos/product-response.dto";

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

async function createProduct(
  request: APIRequestContext,
  input: {
    readonly name: string;
    readonly categoryId: string;
    readonly price: number;
    readonly initialStock: number;
    readonly cost?: number;
  },
): Promise<void> {
  const response = await request.post("/api/v1/products", { data: input });
  expect(response.status()).toBe(201);
}

test.describe("catalog bulk price update api", () => {
  test("supports preview mode by category without persisting prices", async ({ request }) => {
    const uniqueCategoryId = `preview-snack-${Date.now()}`;

    await createProduct(request, {
      name: "Preview Item A",
      categoryId: uniqueCategoryId,
      price: 100,
      cost: 40,
      initialStock: 10,
    });

    await createProduct(request, {
      name: "Preview Item B",
      categoryId: uniqueCategoryId,
      price: 200,
      cost: 80,
      initialStock: 10,
    });

    const previewResponse = await request.post("/api/v1/products/price-batches", {
      data: {
        scope: { type: "category", categoryId: uniqueCategoryId },
        mode: "percentage",
        value: 10,
        previewOnly: true,
      },
      headers: {
        "x-actor-id": "owner-preview",
      },
    });

    expect(previewResponse.status()).toBe(200);
    const previewBody = await previewResponse.json();
    const parsedPreview = bulkPriceUpdateResponseDTOSchema.safeParse(previewBody);
    expect(parsedPreview.success).toBe(true);

    if (!parsedPreview.success) {
      throw new Error("Expected valid bulk preview response");
    }

    expect(parsedPreview.data.previewOnly).toBe(true);
    expect(parsedPreview.data.appliedBy).toBe("owner-preview");
    expect(parsedPreview.data.updatedCount).toBe(2);

    const listResponse = await request.get(`/api/v1/products?categoryId=${uniqueCategoryId}`);
    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    const parsedList = productListResponseDTOSchema.safeParse(listBody);
    expect(parsedList.success).toBe(true);

    if (!parsedList.success) {
      throw new Error("Expected valid product list after preview");
    }

    const prices = parsedList.data.items
      .filter((item) => item.name.startsWith("Preview Item"))
      .map((item) => item.price)
      .sort((a, b) => a - b);
    expect(prices).toEqual([100, 200]);
  });

  test("applies fixed amount update to selected products", async ({ request }) => {
    const marker = Date.now();
    const uniqueCategoryId = `apply-drink-${marker}`;

    await createProduct(request, {
      name: `Apply Item A ${marker}`,
      categoryId: uniqueCategoryId,
      price: 50,
      cost: 20,
      initialStock: 10,
    });

    await createProduct(request, {
      name: `Apply Item B ${marker}`,
      categoryId: uniqueCategoryId,
      price: 70,
      cost: 28,
      initialStock: 10,
    });

    const listBeforeResponse = await request.get(`/api/v1/products?categoryId=${uniqueCategoryId}`);
    const listBeforeBody = await listBeforeResponse.json();
    const listBeforeParsed = productListResponseDTOSchema.parse(listBeforeBody);
    const targetIds = listBeforeParsed.items
      .filter((item) => item.name.endsWith(String(marker)))
      .map((item) => item.id);

    const applyResponse = await request.post("/api/v1/products/price-batches", {
      data: {
        scope: { type: "selection", productIds: targetIds },
        mode: "fixed_amount",
        value: 5,
        previewOnly: false,
      },
      headers: {
        "x-actor-id": "owner-apply",
      },
    });

    expect(applyResponse.status()).toBe(200);
    const applyBody = await applyResponse.json();
    const parsedApply = bulkPriceUpdateResponseDTOSchema.safeParse(applyBody);
    expect(parsedApply.success).toBe(true);

    if (!parsedApply.success) {
      throw new Error("Expected valid apply response");
    }

    expect(parsedApply.data.previewOnly).toBe(false);
    expect(parsedApply.data.appliedBy).toBe("owner-apply");
    expect(parsedApply.data.updatedCount).toBe(2);

    const listAfterResponse = await request.get(`/api/v1/products?categoryId=${uniqueCategoryId}`);
    expect(listAfterResponse.status()).toBe(200);
    const listAfterBody = await listAfterResponse.json();
    const listAfterParsed = productListResponseDTOSchema.parse(listAfterBody);
    const pricesAfter = listAfterParsed.items
      .filter((item) => item.name.endsWith(String(marker)))
      .map((item) => item.price)
      .sort((a, b) => a - b);
    expect(pricesAfter).toEqual([55, 75]);
  });

  test("blocks apply with 409 when resulting prices are invalid", async ({ request }) => {
    await createProduct(request, {
      name: "Conflict Item",
      categoryId: "main",
      price: 10,
      cost: 4,
      initialStock: 10,
    });

    const listResponse = await request.get("/api/v1/products?categoryId=main");
    const listBody = await listResponse.json();
    const parsedList = productListResponseDTOSchema.parse(listBody);
    const conflictTarget = parsedList.items.find((item) => item.name === "Conflict Item");
    if (!conflictTarget) {
      throw new Error("Expected product to exist before conflict test");
    }

    const conflictResponse = await request.post("/api/v1/products/price-batches", {
      data: {
        scope: { type: "selection", productIds: [conflictTarget.id] },
        mode: "fixed_amount",
        value: -20,
        previewOnly: false,
      },
    });

    expect(conflictResponse.status()).toBe(409);
    const conflictBody = await conflictResponse.json();
    expect(apiErrorResponseSchema.safeParse(conflictBody).success).toBe(true);

    const listAfterResponse = await request.get("/api/v1/products?categoryId=main");
    const listAfterBody = await listAfterResponse.json();
    const parsedAfter = productListResponseDTOSchema.parse(listAfterBody);
    const sameProduct = parsedAfter.items.find((item) => item.id === conflictTarget.id);
    expect(sameProduct?.price).toBe(10);
  });
});
