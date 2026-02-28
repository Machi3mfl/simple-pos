import { getBackendMode } from "@/infrastructure/config/runtimeMode";
import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { InMemoryProductRepository } from "@/modules/catalog/infrastructure/repositories/InMemoryProductRepository";
import { SupabaseProductRepository } from "@/modules/catalog/infrastructure/repositories/SupabaseProductRepository";
import type { ProductRepository } from "@/modules/catalog/domain/repositories/ProductRepository";
import { InMemoryInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryInventoryRepository";
import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository";
import type { InventoryRepository } from "@/modules/inventory/domain/repositories/InventoryRepository";
import { InMemorySaleRepository } from "@/modules/sales/infrastructure/repositories/InMemorySaleRepository";
import { SupabaseSaleRepository } from "@/modules/sales/infrastructure/repositories/SupabaseSaleRepository";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";

import { GetProfitSummaryReportUseCase } from "../../application/use-cases/GetProfitSummaryReportUseCase";
import { GetSalesHistoryReportUseCase } from "../../application/use-cases/GetSalesHistoryReportUseCase";
import { GetTopProductsReportUseCase } from "../../application/use-cases/GetTopProductsReportUseCase";

function createRepositories(): {
  saleRepository: SaleRepository;
  productRepository: ProductRepository;
  inventoryRepository: InventoryRepository;
} {
  if (getBackendMode() === "supabase") {
    const client = getSupabaseServerClient();
    return {
      saleRepository: new SupabaseSaleRepository(client),
      productRepository: new SupabaseProductRepository(client),
      inventoryRepository: new SupabaseInventoryRepository(client),
    };
  }

  return {
    saleRepository: new InMemorySaleRepository(),
    productRepository: new InMemoryProductRepository(),
    inventoryRepository: new InMemoryInventoryRepository(),
  };
}

const { saleRepository, productRepository, inventoryRepository } = createRepositories();

export const reportingMockRuntime = {
  getTopProductsReportUseCase: new GetTopProductsReportUseCase(
    saleRepository,
    productRepository,
  ),
  getProfitSummaryReportUseCase: new GetProfitSummaryReportUseCase(
    saleRepository,
    inventoryRepository,
  ),
  getSalesHistoryReportUseCase: new GetSalesHistoryReportUseCase(saleRepository),
};
