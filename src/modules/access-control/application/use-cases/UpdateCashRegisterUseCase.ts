import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";
import type { AccessCashRegisterDefinition } from "../../domain/types/RoleAdministration";

import { RoleAdministrationError } from "./UpdateCustomRoleUseCase";

export class UpdateCashRegisterUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(input: {
    readonly actorId: string;
    readonly registerId: string;
    readonly name: string;
    readonly locationCode?: string;
    readonly isActive: boolean;
  }): Promise<AccessCashRegisterDefinition | null> {
    if (input.name.trim().length < 3) {
      throw new RoleAdministrationError(
        "El nombre de la caja debe tener al menos 3 caracteres.",
      );
    }

    return this.repository.updateCashRegister({
      actorId: input.actorId,
      registerId: input.registerId,
      name: input.name.trim(),
      locationCode: input.locationCode?.trim() || undefined,
      isActive: input.isActive,
    });
  }
}
