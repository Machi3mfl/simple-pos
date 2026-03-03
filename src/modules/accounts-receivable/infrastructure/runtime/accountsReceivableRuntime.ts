import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { SupabaseProductRepository } from "@/modules/catalog/infrastructure/repositories/SupabaseProductRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";
import { SupabaseSaleRepository } from "@/modules/sales/infrastructure/repositories/SupabaseSaleRepository";

import { GetCustomerDebtSummaryUseCase } from "../../application/use-cases/GetCustomerDebtSummaryUseCase";
import { ListReceivablesSnapshotUseCase } from "../../application/use-cases/ListReceivablesSnapshotUseCase";
import { RegisterDebtPaymentUseCase } from "../../application/use-cases/RegisterDebtPaymentUseCase";
import { SupabaseDebtLedgerRepository } from "../repositories/SupabaseDebtLedgerRepository";

export function createAccountsReceivableRuntime(): {
  readonly getCustomerDebtSummaryUseCase: GetCustomerDebtSummaryUseCase;
  readonly listReceivablesSnapshotUseCase: ListReceivablesSnapshotUseCase;
  readonly registerDebtPaymentUseCase: RegisterDebtPaymentUseCase;
} {
  const supabaseClient = getSupabaseServerClient();
  const productRepository = new SupabaseProductRepository(supabaseClient);
  const customerRepository = new SupabaseCustomerRepository(supabaseClient);
  const saleRepository = new SupabaseSaleRepository(supabaseClient);
  const debtLedgerRepository = new SupabaseDebtLedgerRepository(supabaseClient);

  return {
    getCustomerDebtSummaryUseCase: new GetCustomerDebtSummaryUseCase(
      debtLedgerRepository,
      customerRepository,
      saleRepository,
      productRepository,
    ),
    listReceivablesSnapshotUseCase: new ListReceivablesSnapshotUseCase(
      saleRepository,
      debtLedgerRepository,
      customerRepository,
    ),
    registerDebtPaymentUseCase: new RegisterDebtPaymentUseCase(
      debtLedgerRepository,
      customerRepository,
    ),
  };
}
