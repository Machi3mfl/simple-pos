import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import { ProcessSyncEventsBatchUseCase } from "../../application/use-cases/ProcessSyncEventsBatchUseCase";
import { SupabaseSyncEventRepository } from "../repositories/SupabaseSyncEventRepository";

export function createSyncRuntime(): {
  processSyncEventsBatchUseCase: ProcessSyncEventsBatchUseCase;
} {
  const syncEventRepository = new SupabaseSyncEventRepository(getSupabaseServerClient());

  return {
    processSyncEventsBatchUseCase: new ProcessSyncEventsBatchUseCase(syncEventRepository),
  };
}
