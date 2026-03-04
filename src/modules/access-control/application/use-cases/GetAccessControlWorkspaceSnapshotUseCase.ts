import {
  buildRoleAdministrationPermissionGroups,
  buildRoleAdministrationPermissions,
} from "../../domain/services/buildRoleAdministrationCatalog";
import type { RoleAdministrationRepository } from "../../domain/repositories/RoleAdministrationRepository";
import type { AccessControlWorkspaceSnapshot } from "../../domain/types/RoleAdministration";

export class GetAccessControlWorkspaceSnapshotUseCase {
  constructor(
    private readonly repository: RoleAdministrationRepository,
  ) {}

  async execute(): Promise<AccessControlWorkspaceSnapshot> {
    const [roles, users, rawPermissions] = await Promise.all([
      this.repository.listRoles(),
      this.repository.listUsers(),
      this.repository.listPermissions(),
    ]);

    const permissions = buildRoleAdministrationPermissions(rawPermissions);
    const permissionGroups = buildRoleAdministrationPermissionGroups(permissions);

    return {
      roles,
      users,
      permissions,
      permissionGroups,
    };
  }
}
