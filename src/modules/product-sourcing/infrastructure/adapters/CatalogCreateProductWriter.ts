import { CreateProductUseCase } from "@/modules/catalog/application/use-cases/CreateProductUseCase";
import type { ProductRepository } from "@/modules/catalog/domain/repositories/ProductRepository";

import type {
  CatalogProductRecord,
  CatalogProductWriter,
  CreateCatalogProductFromExternalCandidateInput,
} from "../../application/ports/CatalogProductWriter";
import { ProductSourcingDomainError } from "../../domain/errors/ProductSourcingDomainError";
import { resolveImportedProductSku } from "../../domain/services/ResolveImportedProductSku";

export class CatalogCreateProductWriter implements CatalogProductWriter {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly productRepository: ProductRepository,
  ) {}

  async createFromExternalCandidate(
    input: CreateCatalogProductFromExternalCandidateInput,
  ): Promise<CatalogProductRecord> {
    const sku = resolveImportedProductSku(input.providerId, input.sourceProductId);
    const existingProduct = await this.productRepository.getBySku(sku);

    if (existingProduct) {
      throw new ProductSourcingDomainError(
        `Ya existe un producto importado para ${input.providerId} ${input.sourceProductId} (SKU ${sku}).`,
      );
    }

    return this.createProductUseCase.execute({
      sku,
      name: input.name,
      categoryId: input.categoryId,
      price: input.price,
      cost: input.cost,
      initialStock: input.initialStock,
      minStock: input.minStock,
      imageUrl: input.imageUrl,
    });
  }
}
