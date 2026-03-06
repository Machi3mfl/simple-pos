import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";

import { RoleAdministrationError } from "./UpdateCustomRoleUseCase";

export class ReplaceUserCashRegisterAssignmentsUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(params: {
    readonly actorId: string;
    readonly userId: string;
    readonly cashRegisterIds: readonly string[];
  }): Promise<void> {
    const user = await this.repository.findUserById(params.userId);
    if (!user) {
      throw new RoleAdministrationError("No encontramos el usuario seleccionado.");
    }

    const normalizedRegisterIds = Array.from(new Set(params.cashRegisterIds));
    if (normalizedRegisterIds.length > 0) {
      const availableRegisters = await this.repository.listCashRegisters();
      const existingRegisterIds = new Set(availableRegisters.map((register) => register.id));
      const unknownRegisterId = normalizedRegisterIds.find(
        (registerId) => !existingRegisterIds.has(registerId),
      );
      if (unknownRegisterId) {
        throw new RoleAdministrationError(
          "Alguna de las cajas seleccionadas ya no existe.",
        );
      }
    }

    await this.repository.replaceUserCashRegisterAssignments({
      actorId: params.actorId,
      userId: params.userId,
      cashRegisterIds: normalizedRegisterIds,
    });
  }
}
