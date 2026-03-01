import { expect, test } from "@playwright/test";

import type { ExternalCategoryMappingRepository } from "../../src/modules/product-sourcing/application/ports/ExternalCategoryMappingRepository";
import type { RetailerCatalogProvider } from "../../src/modules/product-sourcing/application/ports/RetailerCatalogProvider";
import { SearchExternalProductsUseCase } from "../../src/modules/product-sourcing/application/use-cases/SearchExternalProductsUseCase";
import { CategoryMappingRule } from "../../src/modules/product-sourcing/domain/entities/CategoryMappingRule";
import { ExternalCatalogCandidate } from "../../src/modules/product-sourcing/domain/entities/ExternalCatalogCandidate";
import {
  InvalidSearchPaginationError,
  InvalidSearchQueryError,
} from "../../src/modules/product-sourcing/domain/errors/ProductSourcingDomainError";
import { resolveExternalCategoryPath } from "../../src/modules/product-sourcing/domain/services/ResolveExternalCategoryPath";

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

class InMemoryExternalCategoryMappingRepository
  implements ExternalCategoryMappingRepository
{
  private readonly items = new Map<string, CategoryMappingRule>();

  async getByExternalCategoryPath(
    providerId: "carrefour",
    externalCategoryPath: string,
  ): Promise<CategoryMappingRule | null> {
    return this.items.get(`${providerId}:${externalCategoryPath}`) ?? null;
  }

  async save(rule: CategoryMappingRule): Promise<void> {
    const primitives = rule.toPrimitives();
    this.items.set(
      `${primitives.providerId}:${primitives.externalCategoryPath}`,
      rule,
    );
  }
}

test.describe("product sourcing search use case", () => {
  test("normalizes query and applies default pagination", async () => {
    const provider = new FakeRetailerCatalogProvider();
    const mappingRepository = new InMemoryExternalCategoryMappingRepository();
    const useCase = new SearchExternalProductsUseCase(provider, mappingRepository);

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

  test("reuses a persisted category mapping when the external path was already confirmed", async () => {
    const provider = new FakeRetailerCatalogProvider();
    const mappingRepository = new InMemoryExternalCategoryMappingRepository();
    const externalCategoryPath = resolveExternalCategoryPath([
      "/Bebidas/Gaseosas/Gaseosas cola/",
    ]);

    await mappingRepository.save(
      CategoryMappingRule.create({
        id: `carrefour:${externalCategoryPath}`,
        providerId: "carrefour",
        externalCategoryPath: externalCategoryPath ?? "",
        internalCategoryId: "drink",
      }),
    );

    const useCase = new SearchExternalProductsUseCase(provider, mappingRepository);
    const result = await useCase.execute({ query: "coca cola" });

    expect(result.items[0]?.suggestedCategoryId).toBe("drink");
  });

  test("rejects queries with fewer than 3 meaningful characters", async () => {
    const provider = new FakeRetailerCatalogProvider();
    const mappingRepository = new InMemoryExternalCategoryMappingRepository();
    const useCase = new SearchExternalProductsUseCase(provider, mappingRepository);

    await expect(async () => {
      await useCase.execute({ query: " a " });
    }).rejects.toBeInstanceOf(InvalidSearchQueryError);
  });

  test("rejects invalid page size", async () => {
    const provider = new FakeRetailerCatalogProvider();
    const mappingRepository = new InMemoryExternalCategoryMappingRepository();
    const useCase = new SearchExternalProductsUseCase(provider, mappingRepository);

    await expect(async () => {
      await useCase.execute({ query: "yerba mate", pageSize: 30 });
    }).rejects.toBeInstanceOf(InvalidSearchPaginationError);
  });
});
