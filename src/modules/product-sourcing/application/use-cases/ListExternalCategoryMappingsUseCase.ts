import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import type { ExternalCategoryMappingRepository } from "../ports/ExternalCategoryMappingRepository";

export interface ListExternalCategoryMappingsUseCaseInput {
  readonly providerId: ExternalCatalogProviderId;
  readonly limit: number;
}

export interface ListExternalCategoryMappingsUseCaseOutput {
  readonly items: readonly {
    readonly id: string;
    readonly providerId: ExternalCatalogProviderId;
    readonly externalCategoryPath: string;
    readonly internalCategoryId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }[];
}

export class ListExternalCategoryMappingsUseCase {
  constructor(
    private readonly externalCategoryMappingRepository: ExternalCategoryMappingRepository,
  ) {}

  async execute(
    input: ListExternalCategoryMappingsUseCaseInput,
  ): Promise<ListExternalCategoryMappingsUseCaseOutput> {
    const items = await this.externalCategoryMappingRepository.listByProvider(
      input.providerId,
      input.limit,
    );

    return {
      items: items.map((item) => item.toPrimitives()),
    };
  }
}
