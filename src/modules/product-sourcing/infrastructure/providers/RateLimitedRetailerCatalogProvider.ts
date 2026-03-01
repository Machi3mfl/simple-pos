import type {
  RetailerCatalogProvider,
  SearchRetailerCatalogInput,
  SearchRetailerCatalogResult,
} from "../../application/ports/RetailerCatalogProvider";

interface RateLimitedRetailerCatalogProviderDependencies {
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface RateLimitedRetailerCatalogProviderOptions {
  readonly minIntervalMs: number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RateLimitedRetailerCatalogProvider implements RetailerCatalogProvider {
  private nextAvailableAt = 0;
  private queue: Promise<void> = Promise.resolve();
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly delegate: RetailerCatalogProvider,
    private readonly options: RateLimitedRetailerCatalogProviderOptions,
    dependencies: RateLimitedRetailerCatalogProviderDependencies = {},
  ) {
    this.now = dependencies.now ?? Date.now;
    this.sleep = dependencies.sleep ?? defaultSleep;
  }

  search(input: SearchRetailerCatalogInput): Promise<SearchRetailerCatalogResult> {
    const executeSearch = async (): Promise<SearchRetailerCatalogResult> => {
      const waitMs = Math.max(0, this.nextAvailableAt - this.now());
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }

      this.nextAvailableAt = this.now() + Math.max(0, this.options.minIntervalMs);
      return this.delegate.search(input);
    };

    const result = this.queue.then(executeSearch, executeSearch);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }
}
