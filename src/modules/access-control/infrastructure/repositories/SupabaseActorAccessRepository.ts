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
  readonly permission_id: string;
}

interface PermissionRow {
  readonly id: string;
  readonly code: string;
}

interface RegisterAssignmentRow {
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

    return this.buildActorAccessRecord(appUser);
  }

  async findByAuthUserId(authUserId: string): Promise<ActorAccessRecord | null> {
    const appUser = await this.loadUserByColumn("auth_user_id", authUserId);
    if (!appUser) {
      return null;
    }

    return this.buildActorAccessRecord(appUser);
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
    return Promise.all(appUsers.map((appUser) => this.buildActorAccessRecord(appUser)));
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

  private async buildActorAccessRecord(appUser: AppUser): Promise<ActorAccessRecord> {
    const roleIds = await this.loadRoleIds(appUser.getId());
    const roles = roleIds.length > 0 ? await this.loadRoles(roleIds) : [];
    const permissionIds =
      roleIds.length > 0 ? await this.loadPermissionIdsByRoleIds(roleIds) : [];
    const permissionCodes =
      permissionIds.length > 0 ? await this.loadPermissionCodes(permissionIds) : [];
    const assignedRegisterIds = await this.loadAssignedRegisterIds(appUser.getId());

    return {
      user: appUser,
      roleCodes: roles.map((role) => role.code),
      roleNames: roles.map((role) => role.name),
      permissionCodes,
      assignedRegisterIds,
    };
  }

  private async loadRoleIds(userId: string): Promise<readonly string[]> {
    const { data, error } = await this.client
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to load user role assignments in Supabase: ${error.message}`);
    }

    return Array.from(
      new Set((data as readonly UserRoleAssignmentRow[] | null)?.map((row) => row.role_id) ?? []),
    );
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

  private async loadPermissionIdsByRoleIds(
    roleIds: readonly string[],
  ): Promise<readonly string[]> {
    const { data, error } = await this.client
      .from("role_permission_assignments")
      .select("permission_id")
      .in("role_id", [...roleIds]);

    if (error) {
      throw new Error(`Failed to load role permissions in Supabase: ${error.message}`);
    }

    return Array.from(
      new Set(
        (data as readonly RolePermissionAssignmentRow[] | null)?.map(
          (row) => row.permission_id,
        ) ?? [],
      ),
    );
  }

  private async loadPermissionCodes(
    permissionIds: readonly string[],
  ): Promise<readonly string[]> {
    const { data, error } = await this.client
      .from("permissions")
      .select("id, code")
      .in("id", [...permissionIds]);

    if (error) {
      throw new Error(`Failed to load permissions in Supabase: ${error.message}`);
    }

    return ((data as readonly PermissionRow[] | null) ?? [])
      .map((row) => row.code)
      .sort((left, right) => left.localeCompare(right, "es"));
  }

  private async loadAssignedRegisterIds(
    userId: string,
  ): Promise<readonly string[]> {
    const { data, error } = await this.client
      .from("cash_register_user_assignments")
      .select("cash_register_id")
      .eq("user_id", userId);

    if (error) {
      throw new Error(
        `Failed to load cash register assignments in Supabase: ${error.message}`,
      );
    }

    return Array.from(
      new Set(
        (data as readonly RegisterAssignmentRow[] | null)?.map(
          (row) => row.cash_register_id,
        ) ?? [],
      ),
    ).sort((left, right) => left.localeCompare(right, "es"));
  }
}
