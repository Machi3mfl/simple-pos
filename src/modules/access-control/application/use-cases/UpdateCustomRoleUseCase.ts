import { hasSelfLockoutProtectionPermission } from "../../domain/services/buildRoleAdministrationCatalog";
import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";
import type {
  AccessRoleDefinition,
  UpdateCustomRoleInput,
} from "../../domain/types/RoleAdministration";

export class RoleAdministrationError extends Error {}

export class UpdateCustomRoleUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(input: UpdateCustomRoleInput): Promise<AccessRoleDefinition | null> {
    const role = await this.repository.findRoleById(input.roleId);
    if (!role) {
      return null;
    }

    if (role.isLocked) {
      throw new RoleAdministrationError(
        "Los roles base están bloqueados. Clonalo para crear una variante editable.",
      );
    }

    const currentActorRoleIds = await this.repository.getUserRoleIds(input.actorId);
    if (currentActorRoleIds.includes(input.roleId)) {
      const actorRoles = await this.repository.listRolesByIds(currentActorRoleIds);
      const resultingPermissionCodes = Array.from(
        new Set(
          actorRoles.flatMap((actorRole) =>
            actorRole.id === input.roleId ? input.permissionCodes : actorRole.permissionCodes,
          ),
        ),
      );

      if (!hasSelfLockoutProtectionPermission(resultingPermissionCodes)) {
        throw new RoleAdministrationError(
          "No podés quitarte el último permiso que te permite administrar roles.",
        );
      }
    }

    return this.repository.updateCustomRole(input);
  }
}
