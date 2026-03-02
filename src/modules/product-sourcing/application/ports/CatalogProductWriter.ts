import type { ExternalCatalogProviderId } from "../../domain/entities/ExternalCatalogCandidate";

export interface CatalogProductRecord {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

export interface CreateCatalogProductFromExternalCandidateInput {
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly initialStock: number;
  readonly minStock: number;
  readonly cost?: number;
  readonly imageUrl?: string;
}

export interface CatalogProductWriter {
  createFromExternalCandidate(
    input: CreateCatalogProductFromExternalCandidateInput,
  ): Promise<CatalogProductRecord>;
}
