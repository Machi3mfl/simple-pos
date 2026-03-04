import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { createCashManagementRuntime } from "@/modules/cash-management/infrastructure/runtime/cashManagementRuntime";

import { PassiveSyncEventProcessor } from "../../application/services/PassiveSyncEventProcessor";
import { ProcessSyncEventsBatchUseCase } from "../../application/use-cases/ProcessSyncEventsBatchUseCase";
import { CashMovementSyncEventProcessor } from "../processors/CashMovementSyncEventProcessor";
import { SupabaseSyncEventRepository } from "../repositories/SupabaseSyncEventRepository";

export function createSyncRuntime(): {
  processSyncEventsBatchUseCase: ProcessSyncEventsBatchUseCase;
} {
  const syncEventRepository = new SupabaseSyncEventRepository(getSupabaseServerClient());
  const { recordCashMovementUseCase } = createCashManagementRuntime();

  return {
    processSyncEventsBatchUseCase: new ProcessSyncEventsBatchUseCase(
      syncEventRepository,
      [
        new PassiveSyncEventProcessor([
          "sale_created",
          "stock_movement_created",
          "debt_payment_registered",
        ]),
        new CashMovementSyncEventProcessor(recordCashMovementUseCase),
      ],
    ),
  };
}
