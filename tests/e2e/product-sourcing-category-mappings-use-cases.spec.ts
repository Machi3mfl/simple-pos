import { expect, test } from "./support/test";

import type { ExternalCategoryMappingRepository } from "../../src/modules/product-sourcing/application/ports/ExternalCategoryMappingRepository";
import { DeleteExternalCategoryMappingUseCase } from "../../src/modules/product-sourcing/application/use-cases/DeleteExternalCategoryMappingUseCase";
import { ListExternalCategoryMappingsUseCase } from "../../src/modules/product-sourcing/application/use-cases/ListExternalCategoryMappingsUseCase";
import { UpdateExternalCategoryMappingUseCase } from "../../src/modules/product-sourcing/application/use-cases/UpdateExternalCategoryMappingUseCase";
import { CategoryMappingRule } from "../../src/modules/product-sourcing/domain/entities/CategoryMappingRule";

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

  async listByProvider(): Promise<readonly CategoryMappingRule[]> {
    return Array.from(this.items.values()).sort((left, right) =>
      right.toPrimitives().updatedAt.localeCompare(left.toPrimitives().updatedAt),
    );
  }

  async save(rule: CategoryMappingRule): Promise<void> {
    const primitives = rule.toPrimitives();
    this.items.set(
      `${primitives.providerId}:${primitives.externalCategoryPath}`,
      rule,
    );
  }

  async delete(providerId: "carrefour", externalCategoryPath: string): Promise<void> {
    this.items.delete(`${providerId}:${externalCategoryPath}`);
  }
}

test.describe("product sourcing category mappings use cases", () => {
  test("lists, updates, and deletes learned mappings", async () => {
    const repository = new InMemoryExternalCategoryMappingRepository();
    const updateUseCase = new UpdateExternalCategoryMappingUseCase(repository);
    const listUseCase = new ListExternalCategoryMappingsUseCase(repository);
    const deleteUseCase = new DeleteExternalCategoryMappingUseCase(repository);

    await updateUseCase.execute({
      providerId: "carrefour",
      externalCategoryPath: "bebidas/gaseosas/gaseosas-cola",
      internalCategoryId: "drink",
    });

    await updateUseCase.execute({
      providerId: "carrefour",
      externalCategoryPath: "bebidas/gaseosas/gaseosas-cola",
      internalCategoryId: "snack",
    });

    const listed = await listUseCase.execute({
      providerId: "carrefour",
      limit: 8,
    });

    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.internalCategoryId).toBe("snack");

    await deleteUseCase.execute({
      providerId: "carrefour",
      externalCategoryPath: "bebidas/gaseosas/gaseosas-cola",
    });

    const emptyList = await listUseCase.execute({
      providerId: "carrefour",
      limit: 8,
    });

    expect(emptyList.items).toHaveLength(0);
  });
});
