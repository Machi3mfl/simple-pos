import { CategoryMappingRule } from "../../domain/entities/CategoryMappingRule";
import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";
import type { ExternalCategoryMappingRepository } from "../ports/ExternalCategoryMappingRepository";

export interface UpdateExternalCategoryMappingUseCaseInput {
  readonly providerId: ExternalCatalogProviderId;
  readonly externalCategoryPath: string;
  readonly internalCategoryId: string;
}

export interface UpdateExternalCategoryMappingUseCaseOutput {
  readonly id: string;
  readonly providerId: ExternalCatalogProviderId;
  readonly externalCategoryPath: string;
  readonly internalCategoryId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class UpdateExternalCategoryMappingUseCase {
  constructor(
    private readonly externalCategoryMappingRepository: ExternalCategoryMappingRepository,
  ) {}

  async execute(
    input: UpdateExternalCategoryMappingUseCaseInput,
  ): Promise<UpdateExternalCategoryMappingUseCaseOutput> {
    const timestamp = new Date().toISOString();
    const existing = await this.externalCategoryMappingRepository.getByExternalCategoryPath(
      input.providerId,
      input.externalCategoryPath,
    );

    const rule = existing
      ? existing.retarget(input.internalCategoryId, timestamp)
      : CategoryMappingRule.create({
          id: `${input.providerId}:${input.externalCategoryPath}`,
          providerId: input.providerId,
          externalCategoryPath: input.externalCategoryPath,
          internalCategoryId: input.internalCategoryId,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

    await this.externalCategoryMappingRepository.save(rule);
    return rule.toPrimitives();
  }
}
