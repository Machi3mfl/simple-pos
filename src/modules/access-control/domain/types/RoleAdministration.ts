import type { AppUserKind } from "../entities/AppUser";

export interface AccessPermissionDefinition {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly groupCode: string;
  readonly groupLabel: string;
  readonly groupDescription: string;
}

export interface PermissionGroupDefinition {
  readonly code: string;
  readonly label: string;
  readonly description: string;
  readonly permissionCodes: readonly string[];
}

export interface AccessRoleDefinition {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly isSystem: boolean;
  readonly isLocked: boolean;
  readonly clonedFromRoleId?: string;
  readonly permissionCodes: readonly string[];
  readonly assignedUserCount: number;
  readonly createdAt: Date;
  readonly createdByUserId?: string;
  readonly createdByDisplayName?: string;
  readonly updatedAt: Date;
  readonly updatedByUserId?: string;
  readonly updatedByDisplayName?: string;
}

export interface AccessUserDefinition {
  readonly userId: string;
  readonly displayName: string;
  readonly actorKind: AppUserKind;
  readonly isActive: boolean;
  readonly roleIds: readonly string[];
  readonly roleCodes: readonly string[];
  readonly roleNames: readonly string[];
  readonly assignedRegisterIds: readonly string[];
}

export interface AccessControlWorkspaceSnapshot {
  readonly roles: readonly AccessRoleDefinition[];
  readonly users: readonly AccessUserDefinition[];
  readonly permissions: readonly AccessPermissionDefinition[];
  readonly permissionGroups: readonly PermissionGroupDefinition[];
}

export interface CreateCustomRoleInput {
  readonly actorId: string;
  readonly name: string;
  readonly description?: string;
  readonly permissionCodes: readonly string[];
  readonly clonedFromRoleId?: string;
}

export interface UpdateCustomRoleInput {
  readonly actorId: string;
  readonly roleId: string;
  readonly name: string;
  readonly description?: string;
  readonly permissionCodes: readonly string[];
}

export interface ReplaceUserRolesInput {
  readonly actorId: string;
  readonly userId: string;
  readonly roleIds: readonly string[];
}
