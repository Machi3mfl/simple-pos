import { expect, test } from "./support/test";

import { ExternalCatalogCandidate } from "../../src/modules/product-sourcing/domain/entities/ExternalCatalogCandidate";
import { handleSearchExternalProductsRequest } from "../../src/modules/product-sourcing/presentation/handlers/searchExternalProductsHandler";
import { productSourcingSearchResponseDTOSchema } from "../../src/modules/product-sourcing/presentation/dtos/product-sourcing-search.dto";

test.describe("product sourcing search handler", () => {
  test("returns contract-compliant search results", async () => {
    const response = await handleSearchExternalProductsRequest(
      new Request("http://localhost/api/v1/product-sourcing/search?q=coca%20cola&page=1&pageSize=2"),
      () => ({
        searchExternalProductsUseCase: {
          execute: async () => ({
            providerId: "carrefour" as const,
            items: [
              ExternalCatalogCandidate.create({
                providerId: "carrefour",
                sourceProductId: "393964",
                name: "Gaseosa cola Coca Cola Zero 2,25 lts",
                brand: "Coca Cola",
                categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/"],
                imageUrl: "https://www.carrefour.com.ar/example.jpg",
                referencePrice: 5250,
                productUrl: "https://www.carrefour.com.ar/producto/p",
              }).toPrimitives(),
            ],
            page: 1,
            pageSize: 2,
            hasMore: false,
          }),
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(productSourcingSearchResponseDTOSchema.safeParse(body).success).toBe(true);
  });

  test("returns validation error when q is missing", async () => {
    const response = await handleSearchExternalProductsRequest(
      new Request("http://localhost/api/v1/product-sourcing/search?page=1&pageSize=2"),
      () => {
        throw new Error("runtime should not be called");
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "validation_error",
    });
  });
});
