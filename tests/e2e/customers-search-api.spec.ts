import { expect, test } from "@playwright/test";

import { createCatalogProduct } from "./support/catalog";

test("returns recent and matching customers for on-account checkout lookup", async ({
  request,
}) => {
  const marker = Date.now();
  const customerName = `Maxi API ${marker}`;
  const product = await createCatalogProduct(request, {
    name: `Customer Search Product ${marker}`,
    price: 1899,
  });

  const createSaleResponse = await request.post("/api/v1/sales", {
    data: {
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: "on_account",
      customerName,
      createCustomerIfMissing: true,
    },
  });

  expect(createSaleResponse.status()).toBe(201);

  const searchResponse = await request.get("/api/v1/customers?limit=12&query=maxi");
  expect(searchResponse.status()).toBe(200);
  const searchPayload = (await searchResponse.json()) as {
    readonly items: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  };

  expect(searchPayload.items.some((item) => item.name === customerName)).toBeTruthy();

  const recentResponse = await request.get("/api/v1/customers?limit=12");
  expect(recentResponse.status()).toBe(200);
  const recentPayload = (await recentResponse.json()) as {
    readonly items: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  };

  expect(recentPayload.items.some((item) => item.name === customerName)).toBeTruthy();
});
