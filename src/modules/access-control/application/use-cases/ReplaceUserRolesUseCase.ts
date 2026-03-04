import { hasSelfLockoutProtectionPermission } from "../../domain/services/buildRoleAdministrationCatalog";
import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";

import { RoleAdministrationError } from "./UpdateCustomRoleUseCase";

export class ReplaceUserRolesUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(params: {
    readonly actorId: string;
    readonly userId: string;
    readonly roleIds: readonly string[];
  }): Promise<void> {
    const user = await this.repository.findUserById(params.userId);
    if (!user) {
      throw new RoleAdministrationError("No encontramos el usuario seleccionado.");
    }

    const roles = await this.repository.listRolesByIds(params.roleIds);
    if (roles.length !== params.roleIds.length) {
      throw new RoleAdministrationError("Alguno de los roles seleccionados ya no existe.");
    }

    if (params.actorId === params.userId) {
      const resultingPermissionCodes = Array.from(
        new Set(roles.flatMap((role) => role.permissionCodes)),
      );

      if (!hasSelfLockoutProtectionPermission(resultingPermissionCodes)) {
        throw new RoleAdministrationError(
          "No podés quitarte el último permiso que te permite administrar accesos.",
        );
      }
    }

    await this.repository.replaceUserRoleAssignments(params);
  }
}
