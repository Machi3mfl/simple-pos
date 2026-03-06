import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import { CreateCustomRoleUseCase } from "../../application/use-cases/CreateCustomRoleUseCase";
import { CreateAccessUserUseCase } from "../../application/use-cases/CreateAccessUserUseCase";
import { CreateCashRegisterUseCase } from "../../application/use-cases/CreateCashRegisterUseCase";
import { DeleteCustomRoleUseCase } from "../../application/use-cases/DeleteCustomRoleUseCase";
import { AssumeSelectableActorUseCase } from "../../application/use-cases/AssumeSelectableActorUseCase";
import { GetCurrentActorSnapshotUseCase } from "../../application/use-cases/GetCurrentActorSnapshotUseCase";
import { GetAccessControlWorkspaceSnapshotUseCase } from "../../application/use-cases/GetAccessControlWorkspaceSnapshotUseCase";
import { ListSelectableActorsUseCase } from "../../application/use-cases/ListSelectableActorsUseCase";
import { ReplaceUserCashRegisterAssignmentsUseCase } from "../../application/use-cases/ReplaceUserCashRegisterAssignmentsUseCase";
import { ReplaceUserRolesUseCase } from "../../application/use-cases/ReplaceUserRolesUseCase";
import { UpdateCashRegisterUseCase } from "../../application/use-cases/UpdateCashRegisterUseCase";
import { UpsertUserAuthCredentialsUseCase } from "../../application/use-cases/UpsertUserAuthCredentialsUseCase";
import { UpdateCustomRoleUseCase } from "../../application/use-cases/UpdateCustomRoleUseCase";
import { SupabaseActorAccessRepository } from "../repositories/SupabaseActorAccessRepository";
import { SupabaseRoleAdministrationRepository } from "../repositories/SupabaseRoleAdministrationRepository";

export function createAccessControlRuntime(): {
  readonly getCurrentActorSnapshotUseCase: GetCurrentActorSnapshotUseCase;
  readonly listSelectableActorsUseCase: ListSelectableActorsUseCase;
  readonly assumeSelectableActorUseCase: AssumeSelectableActorUseCase;
  readonly getAccessControlWorkspaceSnapshotUseCase: GetAccessControlWorkspaceSnapshotUseCase;
  readonly createCustomRoleUseCase: CreateCustomRoleUseCase;
  readonly createAccessUserUseCase: CreateAccessUserUseCase;
  readonly createCashRegisterUseCase: CreateCashRegisterUseCase;
  readonly updateCustomRoleUseCase: UpdateCustomRoleUseCase;
  readonly updateCashRegisterUseCase: UpdateCashRegisterUseCase;
  readonly deleteCustomRoleUseCase: DeleteCustomRoleUseCase;
  readonly replaceUserRolesUseCase: ReplaceUserRolesUseCase;
  readonly replaceUserCashRegisterAssignmentsUseCase: ReplaceUserCashRegisterAssignmentsUseCase;
  readonly upsertUserAuthCredentialsUseCase: UpsertUserAuthCredentialsUseCase;
} {
  const supabaseClient = getSupabaseServerClient();
  const actorAccessRepository = new SupabaseActorAccessRepository(supabaseClient);
  const roleAdministrationRepository = new SupabaseRoleAdministrationRepository(
    supabaseClient,
  );

  return {
    getCurrentActorSnapshotUseCase: new GetCurrentActorSnapshotUseCase(
      actorAccessRepository,
    ),
    listSelectableActorsUseCase: new ListSelectableActorsUseCase(actorAccessRepository),
    assumeSelectableActorUseCase: new AssumeSelectableActorUseCase(actorAccessRepository),
    getAccessControlWorkspaceSnapshotUseCase:
      new GetAccessControlWorkspaceSnapshotUseCase(roleAdministrationRepository),
    createCustomRoleUseCase: new CreateCustomRoleUseCase(
      roleAdministrationRepository,
    ),
    createAccessUserUseCase: new CreateAccessUserUseCase(
      roleAdministrationRepository,
    ),
    createCashRegisterUseCase: new CreateCashRegisterUseCase(
      roleAdministrationRepository,
    ),
    updateCustomRoleUseCase: new UpdateCustomRoleUseCase(
      roleAdministrationRepository,
    ),
    updateCashRegisterUseCase: new UpdateCashRegisterUseCase(
      roleAdministrationRepository,
    ),
    deleteCustomRoleUseCase: new DeleteCustomRoleUseCase(
      roleAdministrationRepository,
    ),
    replaceUserRolesUseCase: new ReplaceUserRolesUseCase(
      roleAdministrationRepository,
    ),
    replaceUserCashRegisterAssignmentsUseCase:
      new ReplaceUserCashRegisterAssignmentsUseCase(roleAdministrationRepository),
    upsertUserAuthCredentialsUseCase: new UpsertUserAuthCredentialsUseCase(
      roleAdministrationRepository,
    ),
  };
}
