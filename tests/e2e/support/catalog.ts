import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { productResponseDTOSchema } from "../../../src/modules/catalog/presentation/dtos/product-response.dto";

interface CreateCatalogProductInput {
  readonly name: string;
  readonly categoryId?: string;
  readonly price?: number;
  readonly initialStock?: number;
}

export async function createCatalogProduct(
  request: APIRequestContext,
  input: CreateCatalogProductInput,
): Promise<{ readonly id: string; readonly name: string }> {
  const response = await request.post("/api/v1/products", {
    data: {
      name: input.name,
      categoryId: input.categoryId ?? "snack",
      price: input.price ?? 10,
      initialStock: input.initialStock ?? 10,
    },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  const parsed = productResponseDTOSchema.safeParse(body);
  expect(parsed.success).toBe(true);

  if (!parsed.success) {
    throw new Error("Expected valid product response while creating test product.");
  }

  return {
    id: parsed.data.item.id,
    name: parsed.data.item.name,
  };
}

export async function addProductToCart(
  page: Page,
  productName: string,
  quantity = 1,
): Promise<void> {
  await page.getByLabel("Search menu").fill(productName);
  const productCard = page
    .locator('[data-testid^="product-card-"]')
    .filter({ hasText: productName })
    .first();

  await expect(productCard).toBeVisible();

  for (let index = 0; index < quantity; index += 1) {
    await productCard.click();
  }

  await expect(page.locator('[data-testid^="order-item-"]').first()).toBeVisible();
}
