import { buildCustomRoleCode } from "./buildCustomRoleCode";
import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";
import type {
  AccessRoleDefinition,
  CreateCustomRoleInput,
} from "../../domain/types/RoleAdministration";

export class CreateCustomRoleUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(input: CreateCustomRoleInput): Promise<AccessRoleDefinition> {
    return this.repository.createCustomRole({
      ...input,
      code: buildCustomRoleCode(input.name),
    });
  }
}
