import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";
import type {
  AccessUserDefinition,
  CreateAccessUserInput,
} from "../../domain/types/RoleAdministration";

import { RoleAdministrationError } from "./UpdateCustomRoleUseCase";

export class CreateAccessUserUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(input: CreateAccessUserInput): Promise<AccessUserDefinition> {
    if (input.displayName.trim().length < 3) {
      throw new RoleAdministrationError(
        "El nombre del usuario debe tener al menos 3 caracteres.",
      );
    }

    const normalizedRoleIds = Array.from(new Set(input.roleIds));
    const roles = await this.repository.listRolesByIds(normalizedRoleIds);
    if (roles.length !== normalizedRoleIds.length) {
      throw new RoleAdministrationError(
        "Alguno de los roles seleccionados ya no existe.",
      );
    }

    return this.repository.createUser({
      ...input,
      roleIds: normalizedRoleIds,
    });
  }
}
