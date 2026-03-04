import type {
  AccessPermissionDefinition,
  AccessRoleDefinition,
  AccessUserDefinition,
  CreateCustomRoleInput,
  UpdateCustomRoleInput,
} from "../types/RoleAdministration";

export interface RawAccessPermissionRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface RoleAdministrationRepository {
  listRoles(): Promise<readonly AccessRoleDefinition[]>;
  listRolesByIds(roleIds: readonly string[]): Promise<readonly AccessRoleDefinition[]>;
  findRoleById(roleId: string): Promise<AccessRoleDefinition | null>;
  listUsers(): Promise<readonly AccessUserDefinition[]>;
  findUserById(userId: string): Promise<AccessUserDefinition | null>;
  listPermissions(): Promise<readonly RawAccessPermissionRecord[]>;
  createCustomRole(input: CreateCustomRoleInput & { readonly code: string }): Promise<AccessRoleDefinition>;
  updateCustomRole(input: UpdateCustomRoleInput): Promise<AccessRoleDefinition | null>;
  deleteCustomRole(roleId: string): Promise<boolean>;
  replaceUserRoleAssignments(params: {
    readonly actorId: string;
    readonly userId: string;
    readonly roleIds: readonly string[];
  }): Promise<void>;
  getUserRoleIds(userId: string): Promise<readonly string[]>;
}
