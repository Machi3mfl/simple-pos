import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { CashDebtPaymentRecorderAdapter } from "@/modules/cash-management/application/services/CashDebtPaymentRecorderAdapter";
import { RecordAutomaticCashMovementUseCase } from "@/modules/cash-management/application/use-cases/RecordAutomaticCashMovementUseCase";
import { SupabaseCashMovementRepository } from "@/modules/cash-management/infrastructure/repositories/SupabaseCashMovementRepository";
import { SupabaseCashRegisterSessionRepository } from "@/modules/cash-management/infrastructure/repositories/SupabaseCashRegisterSessionRepository";
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
  const cashRegisterSessionRepository = new SupabaseCashRegisterSessionRepository(
    supabaseClient,
  );
  const cashMovementRepository = new SupabaseCashMovementRepository(supabaseClient);
  const recordAutomaticCashMovementUseCase = new RecordAutomaticCashMovementUseCase(
    cashRegisterSessionRepository,
    cashMovementRepository,
  );
  const cashDebtPaymentRecorder = new CashDebtPaymentRecorderAdapter(
    recordAutomaticCashMovementUseCase,
  );

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
      cashDebtPaymentRecorder,
    ),
  };
}
