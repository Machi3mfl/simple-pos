import { hasSelfLockoutProtectionPermission } from "../../domain/services/buildRoleAdministrationCatalog";
import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";

import { RoleAdministrationError } from "./UpdateCustomRoleUseCase";

export class DeleteCustomRoleUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(params: {
    readonly actorId: string;
    readonly roleId: string;
  }): Promise<boolean> {
    const role = await this.repository.findRoleById(params.roleId);
    if (!role) {
      return false;
    }

    if (role.isLocked) {
      throw new RoleAdministrationError(
        "Los roles base están bloqueados y no pueden eliminarse.",
      );
    }

    if (role.assignedUserCount > 0) {
      throw new RoleAdministrationError(
        "Desasigná este rol de los usuarios antes de eliminarlo.",
      );
    }

    const currentActorRoleIds = await this.repository.getUserRoleIds(params.actorId);
    if (currentActorRoleIds.includes(params.roleId)) {
      const remainingRoleIds = currentActorRoleIds.filter(
        (roleId) => roleId !== params.roleId,
      );
      const remainingRoles = await this.repository.listRolesByIds(remainingRoleIds);
      const resultingPermissionCodes = Array.from(
        new Set(remainingRoles.flatMap((roleItem) => roleItem.permissionCodes)),
      );

      if (!hasSelfLockoutProtectionPermission(resultingPermissionCodes)) {
        throw new RoleAdministrationError(
          "No podés eliminar el último rol que te permite administrar accesos.",
        );
      }
    }

    return this.repository.deleteCustomRole(params.roleId);
  }
}
