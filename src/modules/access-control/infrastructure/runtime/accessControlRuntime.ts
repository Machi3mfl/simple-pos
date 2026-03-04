import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import { AssumeSelectableActorUseCase } from "../../application/use-cases/AssumeSelectableActorUseCase";
import { GetCurrentActorSnapshotUseCase } from "../../application/use-cases/GetCurrentActorSnapshotUseCase";
import { ListSelectableActorsUseCase } from "../../application/use-cases/ListSelectableActorsUseCase";
import { SupabaseActorAccessRepository } from "../repositories/SupabaseActorAccessRepository";

export function createAccessControlRuntime(): {
  readonly getCurrentActorSnapshotUseCase: GetCurrentActorSnapshotUseCase;
  readonly listSelectableActorsUseCase: ListSelectableActorsUseCase;
  readonly assumeSelectableActorUseCase: AssumeSelectableActorUseCase;
} {
  const actorAccessRepository = new SupabaseActorAccessRepository(getSupabaseServerClient());

  return {
    getCurrentActorSnapshotUseCase: new GetCurrentActorSnapshotUseCase(
      actorAccessRepository,
    ),
    listSelectableActorsUseCase: new ListSelectableActorsUseCase(actorAccessRepository),
    assumeSelectableActorUseCase: new AssumeSelectableActorUseCase(actorAccessRepository),
  };
}
