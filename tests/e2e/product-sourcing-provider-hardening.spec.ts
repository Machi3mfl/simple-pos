import { expect, test } from "@playwright/test";

import { SearchQuery } from "../../src/modules/product-sourcing/domain/value-objects/SearchQuery";
import type {
  RetailerCatalogProvider,
  SearchRetailerCatalogInput,
  SearchRetailerCatalogResult,
} from "../../src/modules/product-sourcing/application/ports/RetailerCatalogProvider";
import { ExternalCatalogCandidate } from "../../src/modules/product-sourcing/domain/entities/ExternalCatalogCandidate";
import {
  createConsoleRetailerCatalogProviderHealthLogger,
  ObservedRetailerCatalogProvider,
  type RetailerCatalogProviderHealthEvent,
  type RetailerCatalogProviderHealthLogger,
} from "../../src/modules/product-sourcing/infrastructure/providers/ObservedRetailerCatalogProvider";
import { RateLimitedRetailerCatalogProvider } from "../../src/modules/product-sourcing/infrastructure/providers/RateLimitedRetailerCatalogProvider";
import { ExternalCatalogProviderError } from "../../src/modules/product-sourcing/application/ports/RetailerCatalogProvider";

class StubRetailerCatalogProvider implements RetailerCatalogProvider {
  readonly calls: SearchRetailerCatalogInput[] = [];

  constructor(
    private readonly handler: (
      input: SearchRetailerCatalogInput,
    ) => Promise<SearchRetailerCatalogResult>,
  ) {}

  async search(input: SearchRetailerCatalogInput): Promise<SearchRetailerCatalogResult> {
    this.calls.push(input);
    return this.handler(input);
  }
}

class InMemoryHealthLogger implements RetailerCatalogProviderHealthLogger {
  readonly events: RetailerCatalogProviderHealthEvent[] = [];

  log(event: RetailerCatalogProviderHealthEvent): void {
    this.events.push(event);
  }
}

function createSuccessfulResult(): SearchRetailerCatalogResult {
  return {
    providerId: "carrefour",
    items: [
      ExternalCatalogCandidate.create({
        providerId: "carrefour",
        sourceProductId: "393964",
        name: "Gaseosa cola Coca Cola Zero 2,25 lts",
        categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/"],
        imageUrl: "https://www.carrefour.com.ar/example.jpg",
        referencePrice: 5250,
        productUrl: "https://www.carrefour.com.ar/producto/p",
      }),
    ],
    page: 1,
    pageSize: 12,
    hasMore: false,
  };
}

test.describe("product sourcing provider hardening", () => {
  test("serializes provider calls with a minimum interval", async () => {
    let now = 1_000;
    const waitCalls: number[] = [];
    const provider = new RateLimitedRetailerCatalogProvider(
      new StubRetailerCatalogProvider(async () => createSuccessfulResult()),
      { minIntervalMs: 350 },
      {
        now: () => now,
        sleep: async (ms) => {
          waitCalls.push(ms);
          now += ms;
        },
      },
    );

    await provider.search({
      query: SearchQuery.create("pepsi"),
      page: 1,
      pageSize: 12,
    });

    now += 100;

    await provider.search({
      query: SearchQuery.create("pepsi black"),
      page: 1,
      pageSize: 12,
    });

    expect(waitCalls).toEqual([250]);
  });

  test("logs successful provider health events", async () => {
    const logger = new InMemoryHealthLogger();
    const provider = new ObservedRetailerCatalogProvider(
      new StubRetailerCatalogProvider(async () => createSuccessfulResult()),
      {
        providerId: "carrefour",
        logger,
      },
      {
        now: (() => {
          const timeline = [10, 42];
          return () => timeline.shift() ?? 42;
        })(),
      },
    );

    const result = await provider.search({
      query: SearchQuery.create("pepsi"),
      page: 1,
      pageSize: 12,
    });

    expect(result.items).toHaveLength(1);
    expect(logger.events).toHaveLength(1);
    expect(logger.events[0]).toMatchObject({
      module: "product-sourcing",
      providerId: "carrefour",
      operation: "search",
      outcome: "success",
      latencyMs: 32,
      query: "pepsi",
      page: 1,
      pageSize: 12,
      itemCount: 1,
    });
  });

  test("logs failed provider health events", async () => {
    const logger = new InMemoryHealthLogger();
    const provider = new ObservedRetailerCatalogProvider(
      new StubRetailerCatalogProvider(async () => {
        throw new ExternalCatalogProviderError(
          "provider_request_failed",
          "El proveedor externo rechazo la busqueda solicitada.",
          429,
        );
      }),
      {
        providerId: "carrefour",
        logger,
      },
      {
        now: (() => {
          const timeline = [25, 80];
          return () => timeline.shift() ?? 80;
        })(),
      },
    );

    await expect(
      provider.search({
        query: SearchQuery.create("pepsi"),
        page: 1,
        pageSize: 12,
      }),
    ).rejects.toThrow("El proveedor externo rechazo la busqueda solicitada.");

    expect(logger.events).toHaveLength(1);
    expect(logger.events[0]).toMatchObject({
      module: "product-sourcing",
      providerId: "carrefour",
      operation: "search",
      outcome: "failure",
      latencyMs: 55,
      query: "pepsi",
      page: 1,
      pageSize: 12,
      errorCode: "provider_request_failed",
      status: 429,
    });
  });

  test("console health logger emits structured json", () => {
    const logger = createConsoleRetailerCatalogProviderHealthLogger();
    const output: string[] = [];
    const originalInfo = console.info;
    console.info = (message?: unknown) => {
      output.push(String(message));
    };

    try {
      logger.log({
        module: "product-sourcing",
        providerId: "carrefour",
        operation: "search",
        outcome: "success",
        latencyMs: 12,
        timestamp: "2026-03-01T00:00:00.000Z",
        query: "pepsi",
        page: 1,
        pageSize: 12,
        itemCount: 3,
      });
    } finally {
      console.info = originalInfo;
    }

    expect(output).toHaveLength(1);
    expect(JSON.parse(output[0] ?? "{}")).toMatchObject({
      module: "product-sourcing",
      providerId: "carrefour",
      outcome: "success",
      itemCount: 3,
    });
  });
});
