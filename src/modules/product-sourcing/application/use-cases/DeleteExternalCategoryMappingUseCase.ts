import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import type { ExternalCategoryMappingRepository } from "../ports/ExternalCategoryMappingRepository";

export interface DeleteExternalCategoryMappingUseCaseInput {
  readonly providerId: ExternalCatalogProviderId;
  readonly externalCategoryPath: string;
}

export class DeleteExternalCategoryMappingUseCase {
  constructor(
    private readonly externalCategoryMappingRepository: ExternalCategoryMappingRepository,
  ) {}

  async execute(input: DeleteExternalCategoryMappingUseCaseInput): Promise<void> {
    await this.externalCategoryMappingRepository.delete(
      input.providerId,
      input.externalCategoryPath,
    );
  }
}
