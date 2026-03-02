import type {
  ExternalCatalogCandidate,
  ExternalCatalogProviderId,
} from "../../domain/entities/ExternalCatalogCandidate";
import type { SearchQuery } from "../../domain/value-objects/SearchQuery";

export interface SearchRetailerCatalogInput {
  readonly query: SearchQuery;
  readonly page: number;
  readonly pageSize: number;
}

export interface SearchRetailerCatalogResult {
  readonly providerId: ExternalCatalogProviderId;
  readonly items: readonly ExternalCatalogCandidate[];
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

export interface RetailerCatalogProvider {
  search(input: SearchRetailerCatalogInput): Promise<SearchRetailerCatalogResult>;
}

export class ExternalCatalogProviderError extends Error {
  constructor(
    readonly code: "provider_request_failed" | "provider_payload_invalid",
    message: string,
    readonly causeStatus?: number,
  ) {
    super(message);
    this.name = "ExternalCatalogProviderError";
  }
}
