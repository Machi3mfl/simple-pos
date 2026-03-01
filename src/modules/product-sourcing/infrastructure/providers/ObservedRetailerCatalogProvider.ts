import {
  ExternalCatalogProviderError,
  type RetailerCatalogProvider,
  type SearchRetailerCatalogInput,
  type SearchRetailerCatalogResult,
} from "../../application/ports/RetailerCatalogProvider";

export interface RetailerCatalogProviderHealthEvent {
  readonly module: "product-sourcing";
  readonly providerId: string;
  readonly operation: "search";
  readonly outcome: "success" | "failure";
  readonly latencyMs: number;
  readonly timestamp: string;
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
  readonly itemCount?: number;
  readonly errorCode?: string;
  readonly status?: number;
}

export interface RetailerCatalogProviderHealthLogger {
  log(event: RetailerCatalogProviderHealthEvent): void;
}

interface ObservedRetailerCatalogProviderDependencies {
  readonly now?: () => number;
}

export interface ObservedRetailerCatalogProviderOptions {
  readonly providerId: string;
  readonly logger: RetailerCatalogProviderHealthLogger;
}

export class ObservedRetailerCatalogProvider implements RetailerCatalogProvider {
  private readonly now: () => number;

  constructor(
    private readonly delegate: RetailerCatalogProvider,
    private readonly options: ObservedRetailerCatalogProviderOptions,
    dependencies: ObservedRetailerCatalogProviderDependencies = {},
  ) {
    this.now = dependencies.now ?? Date.now;
  }

  async search(input: SearchRetailerCatalogInput): Promise<SearchRetailerCatalogResult> {
    const startedAt = this.now();

    try {
      const result = await this.delegate.search(input);
      this.options.logger.log({
        module: "product-sourcing",
        providerId: this.options.providerId,
        operation: "search",
        outcome: "success",
        latencyMs: this.now() - startedAt,
        timestamp: new Date().toISOString(),
        query: input.query.value,
        page: input.page,
        pageSize: input.pageSize,
        itemCount: result.items.length,
      });
      return result;
    } catch (error: unknown) {
      this.options.logger.log({
        module: "product-sourcing",
        providerId: this.options.providerId,
        operation: "search",
        outcome: "failure",
        latencyMs: this.now() - startedAt,
        timestamp: new Date().toISOString(),
        query: input.query.value,
        page: input.page,
        pageSize: input.pageSize,
        errorCode:
          error instanceof ExternalCatalogProviderError ? error.code : "provider_request_failed",
        status:
          error instanceof ExternalCatalogProviderError ? error.causeStatus : undefined,
      });
      throw error;
    }
  }
}

export function createConsoleRetailerCatalogProviderHealthLogger(): RetailerCatalogProviderHealthLogger {
  return {
    log(event) {
      console.info(JSON.stringify(event));
    },
  };
}
