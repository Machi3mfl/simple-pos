import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";
import type { AccessCashRegisterDefinition } from "../../domain/types/RoleAdministration";

import { RoleAdministrationError } from "./UpdateCustomRoleUseCase";

export class CreateCashRegisterUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(input: {
    readonly actorId: string;
    readonly name: string;
    readonly locationCode?: string;
  }): Promise<AccessCashRegisterDefinition> {
    if (input.name.trim().length < 3) {
      throw new RoleAdministrationError(
        "El nombre de la caja debe tener al menos 3 caracteres.",
      );
    }

    return this.repository.createCashRegister({
      actorId: input.actorId,
      name: input.name.trim(),
      locationCode: input.locationCode?.trim() || undefined,
    });
  }
}
