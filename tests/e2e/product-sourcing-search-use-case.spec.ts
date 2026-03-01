import { expect, test } from "@playwright/test";

import { ExternalCatalogCandidate } from "../../src/modules/product-sourcing/domain/entities/ExternalCatalogCandidate";
import { InvalidSearchPaginationError, InvalidSearchQueryError } from "../../src/modules/product-sourcing/domain/errors/ProductSourcingDomainError";
import { SearchExternalProductsUseCase } from "../../src/modules/product-sourcing/application/use-cases/SearchExternalProductsUseCase";
import type { RetailerCatalogProvider } from "../../src/modules/product-sourcing/application/ports/RetailerCatalogProvider";

class FakeRetailerCatalogProvider implements RetailerCatalogProvider {
  public lastInput:
    | {
        readonly query: string;
        readonly page: number;
        readonly pageSize: number;
      }
    | null = null;

  async search(input: Parameters<RetailerCatalogProvider["search"]>[0]) {
    this.lastInput = {
      query: input.query.value,
      page: input.page,
      pageSize: input.pageSize,
    };

    return {
      providerId: "carrefour" as const,
      items: [
        ExternalCatalogCandidate.create({
          providerId: "carrefour",
          sourceProductId: "393964",
          name: "Gaseosa cola Coca Cola Zero 2,25 lts",
          categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/"],
          imageUrl: "https://www.carrefour.com.ar/example.jpg",
        }),
      ],
      page: input.page,
      pageSize: input.pageSize,
      hasMore: false,
    };
  }
}

test.describe("product sourcing search use case", () => {
  test("normalizes query and applies default pagination", async () => {
    const provider = new FakeRetailerCatalogProvider();
    const useCase = new SearchExternalProductsUseCase(provider);

    const result = await useCase.execute({
      query: "   coca   cola zero   ",
    });

    expect(provider.lastInput).toEqual({
      query: "coca cola zero",
      page: 1,
      pageSize: 12,
    });
    expect(result.providerId).toBe("carrefour");
    expect(result.items[0]?.suggestedCategoryId).toBe("gaseosas-cola");
  });

  test("rejects queries with fewer than 3 meaningful characters", async () => {
    const provider = new FakeRetailerCatalogProvider();
    const useCase = new SearchExternalProductsUseCase(provider);

    await expect(async () => {
      await useCase.execute({ query: " a " });
    }).rejects.toBeInstanceOf(InvalidSearchQueryError);
  });

  test("rejects invalid page size", async () => {
    const provider = new FakeRetailerCatalogProvider();
    const useCase = new SearchExternalProductsUseCase(provider);

    await expect(async () => {
      await useCase.execute({ query: "yerba mate", pageSize: 30 });
    }).rejects.toBeInstanceOf(InvalidSearchPaginationError);
  });
});
