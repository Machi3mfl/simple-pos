import type { SupabaseClient } from "@supabase/supabase-js";

import { AppUser, type AppUserKind } from "../../domain/entities/AppUser";
import type {
  ActorAccessRecord,
  ActorAccessRepository,
} from "../../domain/repositories/ActorAccessRepository";

interface AppUserRow {
  readonly id: string;
  readonly auth_user_id: string | null;
  readonly display_name: string;
  readonly actor_kind: AppUserKind;
  readonly is_active: boolean;
  readonly created_at: string;
}

interface UserRoleAssignmentRow {
  readonly role_id: string;
}

interface RoleRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

interface RolePermissionAssignmentRow {
  readonly role_id: string;
  readonly permission_id: string;
}

interface PermissionRow {
  readonly id: string;
  readonly code: string;
}

interface RegisterAssignmentRow {
  readonly user_id: string;
  readonly cash_register_id: string;
}

const defaultRolePriority: readonly string[] = [
  "business_manager",
  "shift_supervisor",
  "cashier",
  "executive_readonly",
  "catalog_manager",
  "collections_clerk",
  "system_admin",
  "service_account",
];

function byRolePriority(left: readonly string[], right: readonly string[]): number {
  const leftIndex = defaultRolePriority.findIndex((roleCode) => left.includes(roleCode));
  const rightIndex = defaultRolePriority.findIndex((roleCode) => right.includes(roleCode));
  const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

  return normalizedLeftIndex - normalizedRightIndex;
}

export class SupabaseActorAccessRepository implements ActorAccessRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserId(userId: string): Promise<ActorAccessRecord | null> {
    const appUser = await this.loadUserByColumn("id", userId);
    if (!appUser) {
      return null;
    }

    return (await this.buildActorAccessRecords([appUser]))[0] ?? null;
  }

  async findByAuthUserId(authUserId: string): Promise<ActorAccessRecord | null> {
    const appUser = await this.loadUserByColumn("auth_user_id", authUserId);
    if (!appUser) {
      return null;
    }

    return (await this.buildActorAccessRecords([appUser]))[0] ?? null;
  }

  async findDefaultActor(): Promise<ActorAccessRecord | null> {
    const preferredActorId = process.env.POS_DEFAULT_APP_USER_ID?.trim();
    if (preferredActorId) {
      const preferredActor = await this.findByUserId(preferredActorId);
      if (preferredActor) {
        return preferredActor;
      }
    }

    const actors = await this.listActiveActors();
    if (actors.length === 0) {
      return null;
    }

    return [...actors].sort((left, right) => {
      const rolePriorityDifference = byRolePriority(left.roleCodes, right.roleCodes);
      if (rolePriorityDifference !== 0) {
        return rolePriorityDifference;
      }

      return left.user
        .getDisplayName()
        .localeCompare(right.user.getDisplayName(), "es");
    })[0]!;
  }

  async listActiveActors(): Promise<readonly ActorAccessRecord[]> {
    const { data, error } = await this.client
      .from("app_users")
      .select("*")
      .eq("is_active", true)
      .order("display_name", { ascending: true });

    if (error) {
      throw new Error(`Failed to list app users in Supabase: ${error.message}`);
    }

    const appUsers = (data ?? []).map((row) => this.mapRowToAppUser(row as AppUserRow));
    return this.buildActorAccessRecords(appUsers);
  }

  private async loadUserByColumn(
    column: "id" | "auth_user_id",
    value: string,
  ): Promise<AppUser | null> {
    const { data, error } = await this.client
      .from("app_users")
      .select("*")
      .eq(column, value)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load app user in Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToAppUser(data as AppUserRow);
  }

  private mapRowToAppUser(row: AppUserRow): AppUser {
    return AppUser.create({
      id: row.id,
      authUserId: row.auth_user_id ?? undefined,
      displayName: row.display_name,
      actorKind: row.actor_kind,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    });
  }

  private async buildActorAccessRecords(
    appUsers: readonly AppUser[],
  ): Promise<readonly ActorAccessRecord[]> {
    if (appUsers.length === 0) {
      return [];
    }

    const userIds = appUsers.map((appUser) => appUser.getId());
    const roleAssignments = await this.loadUserRoleAssignments(userIds);
    const roleIds = Array.from(new Set(roleAssignments.map((assignment) => assignment.role_id)));
    const roles = roleIds.length > 0 ? await this.loadRoles(roleIds) : [];
    const rolePermissionAssignments =
      roleIds.length > 0 ? await this.loadRolePermissionAssignments(roleIds) : [];
    const permissionIds = Array.from(
      new Set(rolePermissionAssignments.map((assignment) => assignment.permission_id)),
    );
    const permissions =
      permissionIds.length > 0 ? await this.loadPermissions(permissionIds) : [];
    const registerAssignments = await this.loadAssignedRegisters(userIds);

    const rolesById = new Map(roles.map((role) => [role.id, role]));
    const permissionCodeById = new Map(permissions.map((permission) => [permission.id, permission.code]));
    const roleIdsByUserId = new Map<string, string[]>();
    for (const assignment of roleAssignments) {
      const currentRoleIds = roleIdsByUserId.get(assignment.user_id) ?? [];
      currentRoleIds.push(assignment.role_id);
      roleIdsByUserId.set(assignment.user_id, currentRoleIds);
    }

    const permissionCodesByRoleId = new Map<string, string[]>();
    for (const assignment of rolePermissionAssignments) {
      const permissionCode = permissionCodeById.get(assignment.permission_id);
      if (!permissionCode) {
        continue;
      }

      const currentCodes = permissionCodesByRoleId.get(assignment.role_id) ?? [];
      currentCodes.push(permissionCode);
      permissionCodesByRoleId.set(assignment.role_id, currentCodes);
    }

    const registerIdsByUserId = new Map<string, string[]>();
    for (const assignment of registerAssignments) {
      const currentRegisterIds = registerIdsByUserId.get(assignment.user_id) ?? [];
      currentRegisterIds.push(assignment.cash_register_id);
      registerIdsByUserId.set(assignment.user_id, currentRegisterIds);
    }

    return appUsers.map((appUser) => {
      const roleIdsForUser = Array.from(
        new Set(roleIdsByUserId.get(appUser.getId()) ?? []),
      );
      const rolesForUser = roleIdsForUser
        .map((roleId) => rolesById.get(roleId))
        .filter((role): role is RoleRow => Boolean(role))
        .sort(
          (left, right) =>
            byRolePriority([left.code], [right.code]) ||
            left.name.localeCompare(right.name, "es"),
        );

      const permissionCodes = Array.from(
        new Set(
          roleIdsForUser.flatMap(
            (roleId) => permissionCodesByRoleId.get(roleId) ?? [],
          ),
        ),
      ).sort((left, right) => left.localeCompare(right, "es"));

      const assignedRegisterIds = Array.from(
        new Set(registerIdsByUserId.get(appUser.getId()) ?? []),
      ).sort((left, right) => left.localeCompare(right, "es"));

      return {
        user: appUser,
        roleCodes: rolesForUser.map((role) => role.code),
        roleNames: rolesForUser.map((role) => role.name),
        permissionCodes,
        assignedRegisterIds,
      };
    });
  }

  private async loadUserRoleAssignments(
    userIds: readonly string[],
  ): Promise<readonly (UserRoleAssignmentRow & { readonly user_id: string })[]> {
    const { data, error } = await this.client
      .from("user_role_assignments")
      .select("user_id, role_id")
      .in("user_id", [...userIds]);

    if (error) {
      throw new Error(`Failed to load user role assignments in Supabase: ${error.message}`);
    }

    return (data as readonly (UserRoleAssignmentRow & { readonly user_id: string })[] | null) ?? [];
  }

  private async loadRoles(roleIds: readonly string[]): Promise<readonly RoleRow[]> {
    const { data, error } = await this.client
      .from("roles")
      .select("id, code, name")
      .in("id", [...roleIds]);

    if (error) {
      throw new Error(`Failed to load roles in Supabase: ${error.message}`);
    }

    return [...((data as readonly RoleRow[] | null) ?? [])].sort((left, right) =>
      byRolePriority([left.code], [right.code]) ||
      left.name.localeCompare(right.name, "es"),
    );
  }

  private async loadRolePermissionAssignments(
    roleIds: readonly string[],
  ): Promise<readonly RolePermissionAssignmentRow[]> {
    const { data, error } = await this.client
      .from("role_permission_assignments")
      .select("role_id, permission_id")
      .in("role_id", [...roleIds]);

    if (error) {
      throw new Error(`Failed to load role permissions in Supabase: ${error.message}`);
    }

    return (data as readonly RolePermissionAssignmentRow[] | null) ?? [];
  }

  private async loadPermissions(
    permissionIds: readonly string[],
  ): Promise<readonly PermissionRow[]> {
    const { data, error } = await this.client
      .from("permissions")
      .select("id, code")
      .in("id", [...permissionIds]);

    if (error) {
      throw new Error(`Failed to load permissions in Supabase: ${error.message}`);
    }

    return (data as readonly PermissionRow[] | null) ?? [];
  }

  private async loadAssignedRegisters(
    userIds: readonly string[],
  ): Promise<readonly RegisterAssignmentRow[]> {
    const { data, error } = await this.client
      .from("cash_register_user_assignments")
      .select("user_id, cash_register_id")
      .in("user_id", [...userIds]);

    if (error) {
      throw new Error(
        `Failed to load cash register assignments in Supabase: ${error.message}`,
      );
    }

    return (data as readonly RegisterAssignmentRow[] | null) ?? [];
  }
}
