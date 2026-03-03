import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { SupabaseProductRepository } from "@/modules/catalog/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/repositories/SupabaseInventoryRepository";
import { SupabaseSaleRepository } from "@/modules/sales/infrastructure/repositories/SupabaseSaleRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";
import { SupabaseDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/SupabaseDebtLedgerRepository";

import { GetProfitSummaryReportUseCase } from "../../application/use-cases/GetProfitSummaryReportUseCase";
import { GetSalesHistoryReportUseCase } from "../../application/use-cases/GetSalesHistoryReportUseCase";
import { GetTopProductsReportUseCase } from "../../application/use-cases/GetTopProductsReportUseCase";

export function createReportingRuntime(): {
  getTopProductsReportUseCase: GetTopProductsReportUseCase;
  getProfitSummaryReportUseCase: GetProfitSummaryReportUseCase;
  getSalesHistoryReportUseCase: GetSalesHistoryReportUseCase;
} {
  const client = getSupabaseServerClient();
  const saleRepository = new SupabaseSaleRepository(client);
  const productRepository = new SupabaseProductRepository(client);
  const inventoryRepository = new SupabaseInventoryRepository(client);
  const customerRepository = new SupabaseCustomerRepository(client);
  const debtLedgerRepository = new SupabaseDebtLedgerRepository(client);

  return {
    getTopProductsReportUseCase: new GetTopProductsReportUseCase(
      saleRepository,
      productRepository,
    ),
    getProfitSummaryReportUseCase: new GetProfitSummaryReportUseCase(
      saleRepository,
      inventoryRepository,
    ),
    getSalesHistoryReportUseCase: new GetSalesHistoryReportUseCase(
      saleRepository,
      productRepository,
      customerRepository,
      debtLedgerRepository,
    ),
  };
}
