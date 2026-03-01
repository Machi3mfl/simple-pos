import type { ExternalCatalogCandidatePrimitives } from "../../domain/entities/ExternalCatalogCandidate";
import {
  InvalidSearchPaginationError,
} from "../../domain/errors/ProductSourcingDomainError";
import { SearchQuery } from "../../domain/value-objects/SearchQuery";
import type { RetailerCatalogProvider } from "../ports/RetailerCatalogProvider";

export interface SearchExternalProductsUseCaseInput {
  readonly query: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface SearchExternalProductsUseCaseOutput {
  readonly providerId: "carrefour";
  readonly items: readonly ExternalCatalogCandidatePrimitives[];
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

export class SearchExternalProductsUseCase {
  constructor(private readonly retailerCatalogProvider: RetailerCatalogProvider) {}

  async execute(
    input: SearchExternalProductsUseCaseInput,
  ): Promise<SearchExternalProductsUseCaseOutput> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 12;

    if (!Number.isInteger(page) || page <= 0) {
      throw new InvalidSearchPaginationError("page");
    }

    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 12) {
      throw new InvalidSearchPaginationError("pageSize");
    }

    const query = SearchQuery.create(input.query);
    const result = await this.retailerCatalogProvider.search({
      query,
      page,
      pageSize,
    });

    return {
      providerId: result.providerId,
      items: result.items.map((item) => item.toPrimitives()),
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
    };
  }
}
