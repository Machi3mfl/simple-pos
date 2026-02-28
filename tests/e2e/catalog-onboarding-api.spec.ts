import { expect, test } from "@playwright/test";
import { z } from "zod";

import {
  productListResponseDTOSchema,
  productResponseDTOSchema,
} from "../../src/modules/catalog/presentation/dtos/product-response.dto";

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

test.describe("catalog onboarding api", () => {
  test("creates product with deterministic placeholder when image is missing", async ({
    request,
  }) => {
    const firstResponse = await request.post("/api/v1/products", {
      data: {
        name: "Yerba Mate",
        categoryId: "drink",
        price: 12.5,
        initialStock: 15,
      },
    });

    expect(firstResponse.status()).toBe(201);
    const firstBody = await firstResponse.json();
    const firstParsed = productResponseDTOSchema.safeParse(firstBody);
    expect(firstParsed.success).toBe(true);

    if (!firstParsed.success) {
      throw new Error("Expected valid product response for first creation");
    }

    expect(firstParsed.data.item.imageUrl.startsWith("data:image/svg+xml,")).toBe(true);
    expect(firstParsed.data.item.isActive).toBe(true);
    expect(firstParsed.data.item.stock).toBe(15);

    const secondResponse = await request.post("/api/v1/products", {
      data: {
        name: "Soda Limon",
        categoryId: "drink",
        price: 10,
        initialStock: 8,
      },
    });

    expect(secondResponse.status()).toBe(201);
    const secondBody = await secondResponse.json();
    const secondParsed = productResponseDTOSchema.safeParse(secondBody);
    expect(secondParsed.success).toBe(true);

    if (!secondParsed.success) {
      throw new Error("Expected valid product response for second creation");
    }

    expect(secondParsed.data.item.imageUrl).toBe(firstParsed.data.item.imageUrl);
  });

  test("respects explicit imageUrl and supports list filters", async ({ request }) => {
    const customImageUrl = "https://example.com/images/product-001.png";

    const createResponse = await request.post("/api/v1/products", {
      data: {
        name: "Alfajor Premium",
        categoryId: "snack",
        price: 4.25,
        initialStock: 30,
        imageUrl: customImageUrl,
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    const createParsed = productResponseDTOSchema.safeParse(createBody);
    expect(createParsed.success).toBe(true);

    if (!createParsed.success) {
      throw new Error("Expected valid product response for explicit image");
    }

    expect(createParsed.data.item.imageUrl).toBe(customImageUrl);

    const listResponse = await request.get("/api/v1/products?categoryId=snack&activeOnly=true");
    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    const listParsed = productListResponseDTOSchema.safeParse(listBody);
    expect(listParsed.success).toBe(true);

    if (!listParsed.success) {
      throw new Error("Expected valid product list response");
    }

    expect(listParsed.data.items.some((item) => item.name === "Alfajor Premium")).toBe(true);
  });

  test("returns validation errors for invalid payload and invalid query params", async ({
    request,
  }) => {
    const invalidCreateResponse = await request.post("/api/v1/products", {
      data: {
        name: "",
        categoryId: "snack",
        price: 0,
        initialStock: -1,
      },
    });

    expect(invalidCreateResponse.status()).toBe(400);
    const invalidCreateBody = await invalidCreateResponse.json();
    expect(apiErrorResponseSchema.safeParse(invalidCreateBody).success).toBe(true);

    const invalidListResponse = await request.get("/api/v1/products?activeOnly=maybe");
    expect(invalidListResponse.status()).toBe(400);
    const invalidListBody = await invalidListResponse.json();
    expect(apiErrorResponseSchema.safeParse(invalidListBody).success).toBe(true);
  });
});
