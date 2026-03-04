import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";
import type { UpsertedUserAuthCredentials } from "../../domain/types/RoleAdministration";

import { RoleAdministrationError } from "./UpdateCustomRoleUseCase";

export class UpsertUserAuthCredentialsUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(params: {
    readonly actorId: string;
    readonly userId: string;
    readonly email: string;
    readonly password: string;
  }): Promise<UpsertedUserAuthCredentials> {
    const user = await this.repository.findUserById(params.userId);
    if (!user) {
      throw new RoleAdministrationError("No encontramos el usuario seleccionado.");
    }

    if (!user.isActive || user.actorKind !== "human") {
      throw new RoleAdministrationError(
        "Solo podés generar acceso real para usuarios humanos activos.",
      );
    }

    return this.repository.upsertUserAuthCredentials({
      actorId: params.actorId,
      userId: params.userId,
      email: params.email,
      password: params.password,
    });
  }
}
