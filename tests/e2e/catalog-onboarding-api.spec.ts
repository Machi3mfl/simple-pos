import { expect, test } from "./support/test";
import { z } from "zod";

import {
  productListResponseDTOSchema,
  productResponseDTOSchema,
} from "../../src/modules/catalog/presentation/dtos/product-response.dto";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6BYAAAAASUVORK5CYII=";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

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
        cost: 5,
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

    const firstImageUrl = firstParsed.data.item.imageUrl;
    expect(firstImageUrl).toBeTruthy();
    expect(firstImageUrl?.startsWith("data:image/svg+xml,")).toBe(true);
    expect(firstParsed.data.item.isActive).toBe(true);
    expect(firstParsed.data.item.stock).toBe(15);

    const secondResponse = await request.post("/api/v1/products", {
      data: {
        name: "Soda Limon",
        categoryId: "drink",
        price: 10,
        cost: 4,
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

    expect(secondParsed.data.item.imageUrl).toBe(firstImageUrl);
  });

  test("copies explicit imageUrl into managed Supabase Storage and supports list filters", async ({
    request,
  }) => {
    const ean = `7790${Date.now().toString().slice(-8)}`;
    const createResponse = await request.post("/api/v1/products", {
      data: {
        name: "Alfajor Premium",
        ean,
        categoryId: "snack",
        price: 4.25,
        cost: 2,
        initialStock: 30,
        imageUrl: TINY_PNG_DATA_URL,
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    const createParsed = productResponseDTOSchema.safeParse(createBody);
    expect(createParsed.success).toBe(true);

    if (!createParsed.success) {
      throw new Error("Expected valid product response for explicit image");
    }

    expect(createParsed.data.item.imageUrl).toContain(
      "/storage/v1/object/public/product-images/",
    );
    expect(createParsed.data.item.ean).toBe(ean);

    const listResponse = await request.get(
      `/api/v1/products?categoryId=snack&activeOnly=true&q=${ean}`,
    );
    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    const listParsed = productListResponseDTOSchema.safeParse(listBody);
    expect(listParsed.success).toBe(true);

    if (!listParsed.success) {
      throw new Error("Expected valid product list response");
    }

    expect(listParsed.data.items.some((item) => item.name === "Alfajor Premium")).toBe(true);
  });

  test("updates a product image via multipart upload and persists the managed storage URL", async ({
    request,
  }) => {
    const createResponse = await request.post("/api/v1/products", {
      data: {
        name: "Bizcochos de prueba",
        categoryId: "snack",
        price: 9,
        cost: 3,
        initialStock: 10,
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    const createParsed = productResponseDTOSchema.safeParse(createBody);
    expect(createParsed.success).toBe(true);

    if (!createParsed.success) {
      throw new Error("Expected valid product response for image update creation");
    }

    const updateResponse = await request.patch(`/api/v1/products/${createParsed.data.item.id}`, {
      multipart: {
        name: "Bizcochos de prueba editados",
        ean: "7790895000997",
        imageFile: {
          name: "bizcochos.png",
          mimeType: "image/png",
          buffer: TINY_PNG_BUFFER,
        },
      },
    });

    expect(updateResponse.status()).toBe(200);
    const updateBody = await updateResponse.json();
    const updateParsed = productResponseDTOSchema.safeParse(updateBody);
    expect(updateParsed.success).toBe(true);

    if (!updateParsed.success) {
      throw new Error("Expected valid product response for multipart image update");
    }

    expect(updateParsed.data.item.name).toBe("Bizcochos de prueba editados");
    expect(updateParsed.data.item.ean).toBe("7790895000997");
    expect(updateParsed.data.item.imageUrl).toContain(
      "/storage/v1/object/public/product-images/",
    );
    expect(updateParsed.data.item.imageUrl).not.toBe(createParsed.data.item.imageUrl);
  });

  test("canonicalizes custom category names into stable category codes", async ({
    request,
  }) => {
    const createResponse = await request.post("/api/v1/products", {
      data: {
        name: "Tostadas Artesanales",
        categoryId: "Desayuno y merienda",
        price: 3.5,
        cost: 1.2,
        initialStock: 12,
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    const createParsed = productResponseDTOSchema.safeParse(createBody);
    expect(createParsed.success).toBe(true);

    if (!createParsed.success) {
      throw new Error("Expected valid product response for canonical category creation");
    }

    expect(createParsed.data.item.categoryId).toBe("desayuno-y-merienda");
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
