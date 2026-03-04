import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { SupabaseActorAccessRepository } from "@/modules/access-control/infrastructure/repositories/SupabaseActorAccessRepository";

import { CloseCashRegisterSessionUseCase } from "../../application/use-cases/CloseCashRegisterSessionUseCase";
import { GetActiveCashRegisterSessionUseCase } from "../../application/use-cases/GetActiveCashRegisterSessionUseCase";
import { ListAccessibleCashRegistersUseCase } from "../../application/use-cases/ListAccessibleCashRegistersUseCase";
import { OpenCashRegisterSessionUseCase } from "../../application/use-cases/OpenCashRegisterSessionUseCase";
import { SupabaseCashMovementRepository } from "../repositories/SupabaseCashMovementRepository";
import { SupabaseCashRegisterRepository } from "../repositories/SupabaseCashRegisterRepository";
import { SupabaseCashRegisterSessionRepository } from "../repositories/SupabaseCashRegisterSessionRepository";

export function createCashManagementRuntime(): {
  readonly listAccessibleCashRegistersUseCase: ListAccessibleCashRegistersUseCase;
  readonly getActiveCashRegisterSessionUseCase: GetActiveCashRegisterSessionUseCase;
  readonly openCashRegisterSessionUseCase: OpenCashRegisterSessionUseCase;
  readonly closeCashRegisterSessionUseCase: CloseCashRegisterSessionUseCase;
} {
  const client = getSupabaseServerClient();
  const cashRegisterRepository = new SupabaseCashRegisterRepository(client);
  const cashRegisterSessionRepository = new SupabaseCashRegisterSessionRepository(client);
  const cashMovementRepository = new SupabaseCashMovementRepository(client);
  const actorAccessRepository = new SupabaseActorAccessRepository(client);

  return {
    listAccessibleCashRegistersUseCase: new ListAccessibleCashRegistersUseCase(
      cashRegisterRepository,
      cashRegisterSessionRepository,
      actorAccessRepository,
    ),
    getActiveCashRegisterSessionUseCase: new GetActiveCashRegisterSessionUseCase(
      cashRegisterRepository,
      cashRegisterSessionRepository,
      actorAccessRepository,
    ),
    openCashRegisterSessionUseCase: new OpenCashRegisterSessionUseCase(
      cashRegisterRepository,
      cashRegisterSessionRepository,
      cashMovementRepository,
      actorAccessRepository,
    ),
    closeCashRegisterSessionUseCase: new CloseCashRegisterSessionUseCase(
      cashRegisterSessionRepository,
      actorAccessRepository,
    ),
  };
}
