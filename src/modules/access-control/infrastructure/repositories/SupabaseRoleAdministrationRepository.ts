import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  RoleAdministrationRepository,
  RawAccessPermissionRecord,
} from "../../domain/repositories/RoleAdministrationRepository";
import type {
  AccessRoleDefinition,
  AccessUserDefinition,
  CreateAccessUserInput,
  CreateCustomRoleInput,
  UpsertedUserAuthCredentials,
  UpsertUserAuthCredentialsInput,
  UpdateCustomRoleInput,
} from "../../domain/types/RoleAdministration";

interface AppUserRow {
  readonly id: string;
  readonly auth_user_id: string | null;
  readonly display_name: string;
  readonly actor_kind: "human" | "system";
  readonly is_active: boolean;
}

interface RoleRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_system: boolean;
  readonly is_locked: boolean;
  readonly cloned_from_role_id: string | null;
  readonly created_at: string;
  readonly created_by_user_id: string | null;
  readonly updated_at: string;
  readonly updated_by_user_id: string | null;
}

interface PermissionRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

interface UserRoleAssignmentRow {
  readonly user_id: string;
  readonly role_id: string;
}

interface RolePermissionAssignmentRow {
  readonly role_id: string;
  readonly permission_id: string;
}

interface RegisterAssignmentRow {
  readonly user_id: string;
  readonly cash_register_id: string;
}

interface AuthUserProfile {
  readonly authUserId: string;
  readonly email?: string;
  readonly exists: boolean;
}

const seededRolePriority = [
  "business_manager",
  "shift_supervisor",
  "cashier",
  "collections_clerk",
  "catalog_manager",
  "executive_readonly",
  "system_admin",
  "service_account",
] as const;

function compareRoleOrder(left: RoleRow, right: RoleRow): number {
  const leftPriority = seededRolePriority.indexOf(left.code as (typeof seededRolePriority)[number]);
  const rightPriority = seededRolePriority.indexOf(
    right.code as (typeof seededRolePriority)[number],
  );
  const normalizedLeft = leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority;
  const normalizedRight = rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority;

  if (normalizedLeft !== normalizedRight) {
    return normalizedLeft - normalizedRight;
  }

  if (left.is_system !== right.is_system) {
    return left.is_system ? -1 : 1;
  }

  return left.name.localeCompare(right.name, "es");
}

export class SupabaseRoleAdministrationRepository
  implements RoleAdministrationRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async listRoles(): Promise<readonly AccessRoleDefinition[]> {
    const roles = await this.loadRoles();
    return this.buildRoles(roles);
  }

  async listRolesByIds(roleIds: readonly string[]): Promise<readonly AccessRoleDefinition[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const roles = await this.loadRoles(roleIds);
    return this.buildRoles(roles);
  }

  async findRoleById(roleId: string): Promise<AccessRoleDefinition | null> {
    const roles = await this.listRolesByIds([roleId]);
    return roles[0] ?? null;
  }

  async listUsers(): Promise<readonly AccessUserDefinition[]> {
    const users = await this.loadUsers();
    return this.buildUsers(users);
  }

  async findUserById(userId: string): Promise<AccessUserDefinition | null> {
    const users = await this.loadUsers([userId]);
    const builtUsers = await this.buildUsers(users);
    return builtUsers[0] ?? null;
  }

  async createUser(input: CreateAccessUserInput): Promise<AccessUserDefinition> {
    const displayName = input.displayName.trim();
    if (displayName.length < 3) {
      throw new Error("El nombre del usuario debe tener al menos 3 caracteres.");
    }

    if (input.roleIds.length > 0) {
      const roles = await this.loadRoles(input.roleIds);
      if (roles.length !== input.roleIds.length) {
        throw new Error("Alguno de los roles seleccionados ya no existe.");
      }
    }

    const userId = `user_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const { error: createUserError } = await this.client.from("app_users").insert({
      id: userId,
      auth_user_id: null,
      display_name: displayName,
      actor_kind: input.actorKind,
      is_active: true,
      created_at: now,
    });

    if (createUserError) {
      throw new Error(`Failed to create app user in Supabase: ${createUserError.message}`);
    }

    if (input.roleIds.length > 0) {
      const { error: insertRolesError } = await this.client
        .from("user_role_assignments")
        .insert(
          input.roleIds.map((roleId) => ({
            id: `ura_${crypto.randomUUID()}`,
            user_id: userId,
            role_id: roleId,
            assigned_by_user_id: input.actorId,
          })),
        );

      if (insertRolesError) {
        throw new Error(
          `Failed to assign initial roles to the user in Supabase: ${insertRolesError.message}`,
        );
      }
    }

    const createdUser = await this.findUserById(userId);
    if (!createdUser) {
      throw new Error("No se pudo recargar el usuario creado.");
    }

    return createdUser;
  }

  async upsertUserAuthCredentials(
    input: UpsertUserAuthCredentialsInput,
  ): Promise<UpsertedUserAuthCredentials> {
    const [user] = await this.loadUsers([input.userId]);
    if (!user) {
      throw new Error("No encontramos el usuario seleccionado.");
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const password = input.password.trim();
    if (normalizedEmail.length === 0) {
      throw new Error("El correo de acceso no puede quedar vacío.");
    }
    if (password.length < 8) {
      throw new Error("La contraseña temporal debe tener al menos 8 caracteres.");
    }

    const currentAuthUserId = user.auth_user_id ?? undefined;
    const currentAuthProfile = currentAuthUserId
      ? await this.loadAuthUserProfile(currentAuthUserId)
      : null;

    let authUserId = currentAuthProfile?.exists ? currentAuthUserId : undefined;
    let wasCreated = false;

    if (authUserId) {
      const { data, error } = await this.client.auth.admin.updateUserById(authUserId, {
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          app_user_id: user.id,
          display_name: user.display_name,
        },
      });

      if (error || !data.user) {
        throw new Error(
          error?.message ??
            "No se pudieron actualizar las credenciales del usuario.",
        );
      }
    } else {
      const { data, error } = await this.client.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          app_user_id: user.id,
          display_name: user.display_name,
        },
      });

      if (error || !data.user) {
        throw new Error(
          error?.message ?? "No se pudieron crear las credenciales del usuario.",
        );
      }

      authUserId = data.user.id;
      wasCreated = true;
    }

    const { error: updateUserError } = await this.client
      .from("app_users")
      .update({ auth_user_id: authUserId })
      .eq("id", user.id);

    if (updateUserError) {
      throw new Error(
        `Failed to link app user auth credentials in Supabase: ${updateUserError.message}`,
      );
    }

    return {
      userId: user.id,
      displayName: user.display_name,
      authUserId: authUserId!,
      authEmail: normalizedEmail,
      wasCreated,
    };
  }

  async listPermissions(): Promise<readonly RawAccessPermissionRecord[]> {
    const { data, error } = await this.client
      .from("permissions")
      .select("id, code, name")
      .order("code", { ascending: true });

    if (error) {
      throw new Error(`Failed to load permissions in Supabase: ${error.message}`);
    }

    return (data as readonly PermissionRow[] | null) ?? [];
  }

  async createCustomRole(
    input: CreateCustomRoleInput & { readonly code: string },
  ): Promise<AccessRoleDefinition> {
    const permissionRows = await this.loadPermissionsByCodes(input.permissionCodes);
    if (permissionRows.length !== new Set(input.permissionCodes).size) {
      throw new Error("Alguno de los permisos seleccionados ya no existe.");
    }

    if (input.clonedFromRoleId) {
      const sourceRole = await this.findRoleById(input.clonedFromRoleId);
      if (!sourceRole) {
        throw new Error("El rol base elegido para clonar ya no existe.");
      }
    }

    const roleId = `role_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const { error } = await this.client.from("roles").insert({
      id: roleId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      is_system: false,
      is_locked: false,
      cloned_from_role_id: input.clonedFromRoleId ?? null,
      created_at: now,
      created_by_user_id: input.actorId,
      updated_at: now,
      updated_by_user_id: input.actorId,
    });

    if (error) {
      throw new Error(`Failed to create role in Supabase: ${error.message}`);
    }

    if (permissionRows.length > 0) {
      const { error: insertAssignmentsError } = await this.client
        .from("role_permission_assignments")
        .insert(
          permissionRows.map((permissionRow) => ({
            id: `rpa_${crypto.randomUUID()}`,
            role_id: roleId,
            permission_id: permissionRow.id,
          })),
        );

      if (insertAssignmentsError) {
        throw new Error(
          `Failed to create role permissions in Supabase: ${insertAssignmentsError.message}`,
        );
      }
    }

    const createdRole = await this.findRoleById(roleId);
    if (!createdRole) {
      throw new Error("No se pudo volver a cargar el rol creado.");
    }

    return createdRole;
  }

  async updateCustomRole(
    input: UpdateCustomRoleInput,
  ): Promise<AccessRoleDefinition | null> {
    const existingRole = await this.findRoleById(input.roleId);
    if (!existingRole) {
      return null;
    }

    const permissionRows = await this.loadPermissionsByCodes(input.permissionCodes);
    if (permissionRows.length !== new Set(input.permissionCodes).size) {
      throw new Error("Alguno de los permisos seleccionados ya no existe.");
    }

    const now = new Date().toISOString();
    const { error: updateRoleError } = await this.client
      .from("roles")
      .update({
        name: input.name,
        description: input.description ?? null,
        updated_at: now,
        updated_by_user_id: input.actorId,
      })
      .eq("id", input.roleId);

    if (updateRoleError) {
      throw new Error(`Failed to update role in Supabase: ${updateRoleError.message}`);
    }

    const { error: deleteAssignmentsError } = await this.client
      .from("role_permission_assignments")
      .delete()
      .eq("role_id", input.roleId);

    if (deleteAssignmentsError) {
      throw new Error(
        `Failed to replace role permissions in Supabase: ${deleteAssignmentsError.message}`,
      );
    }

    if (permissionRows.length > 0) {
      const { error: insertAssignmentsError } = await this.client
        .from("role_permission_assignments")
        .insert(
          permissionRows.map((permissionRow) => ({
            id: `rpa_${crypto.randomUUID()}`,
            role_id: input.roleId,
            permission_id: permissionRow.id,
          })),
        );

      if (insertAssignmentsError) {
        throw new Error(
          `Failed to store updated role permissions in Supabase: ${insertAssignmentsError.message}`,
        );
      }
    }

    return this.findRoleById(input.roleId);
  }

  async deleteCustomRole(roleId: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("roles")
      .delete({ count: "exact" })
      .eq("id", roleId);

    if (error) {
      throw new Error(`Failed to delete role in Supabase: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  async replaceUserRoleAssignments(params: {
    readonly actorId: string;
    readonly userId: string;
    readonly roleIds: readonly string[];
  }): Promise<void> {
    const { error: deleteError } = await this.client
      .from("user_role_assignments")
      .delete()
      .eq("user_id", params.userId);

    if (deleteError) {
      throw new Error(
        `Failed to replace user role assignments in Supabase: ${deleteError.message}`,
      );
    }

    if (params.roleIds.length === 0) {
      return;
    }

    const { error: insertError } = await this.client
      .from("user_role_assignments")
      .insert(
        params.roleIds.map((roleId) => ({
          id: `ura_${crypto.randomUUID()}`,
          user_id: params.userId,
          role_id: roleId,
          assigned_by_user_id: params.actorId,
        })),
      );

    if (insertError) {
      throw new Error(
        `Failed to assign roles to the user in Supabase: ${insertError.message}`,
      );
    }
  }

  async getUserRoleIds(userId: string): Promise<readonly string[]> {
    const { data, error } = await this.client
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to load user roles in Supabase: ${error.message}`);
    }

    return Array.from(
      new Set(
        (
          (data as readonly { readonly role_id: string }[] | null) ?? []
        ).map(
          (assignment) => assignment.role_id,
        ),
      ),
    );
  }

  private async buildRoles(roles: readonly RoleRow[]): Promise<readonly AccessRoleDefinition[]> {
    if (roles.length === 0) {
      return [];
    }

    const roleIds = roles.map((role) => role.id);
    const [rolePermissionAssignments, userRoleAssignments] = await Promise.all([
      this.loadRolePermissionAssignments(roleIds),
      this.loadUserRoleAssignments(undefined, roleIds),
    ]);

    const permissionRows = await this.loadPermissionsByIds(
      Array.from(
        new Set(rolePermissionAssignments.map((assignment) => assignment.permission_id)),
      ),
    );
    const auditUserIds = Array.from(
      new Set(
        roles.flatMap((role) =>
          [role.created_by_user_id, role.updated_by_user_id].filter(
            (value): value is string => Boolean(value),
          ),
        ),
      ),
    );
    const auditUsers = auditUserIds.length > 0 ? await this.loadUsers(auditUserIds) : [];

    const permissionCodeById = new Map(permissionRows.map((permission) => [permission.id, permission.code]));
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

    const assignedUserCountByRoleId = new Map<string, number>();
    for (const assignment of userRoleAssignments) {
      assignedUserCountByRoleId.set(
        assignment.role_id,
        (assignedUserCountByRoleId.get(assignment.role_id) ?? 0) + 1,
      );
    }

    const auditUserById = new Map(auditUsers.map((user) => [user.id, user.display_name]));

    return [...roles]
      .sort(compareRoleOrder)
      .map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description ?? undefined,
        isSystem: role.is_system,
        isLocked: role.is_locked,
        clonedFromRoleId: role.cloned_from_role_id ?? undefined,
        permissionCodes: Array.from(
          new Set(permissionCodesByRoleId.get(role.id) ?? []),
        ).sort((left, right) => left.localeCompare(right, "es")),
        assignedUserCount: assignedUserCountByRoleId.get(role.id) ?? 0,
        createdAt: new Date(role.created_at),
        createdByUserId: role.created_by_user_id ?? undefined,
        createdByDisplayName: role.created_by_user_id
          ? auditUserById.get(role.created_by_user_id)
          : undefined,
        updatedAt: new Date(role.updated_at),
        updatedByUserId: role.updated_by_user_id ?? undefined,
        updatedByDisplayName: role.updated_by_user_id
          ? auditUserById.get(role.updated_by_user_id)
          : undefined,
      }));
  }

  private async buildUsers(users: readonly AppUserRow[]): Promise<readonly AccessUserDefinition[]> {
    if (users.length === 0) {
      return [];
    }

    const userIds = users.map((user) => user.id);
    const [userRoleAssignments, registerAssignments] = await Promise.all([
      this.loadUserRoleAssignments(userIds),
      this.loadRegisterAssignments(userIds),
    ]);
    const roleIds = Array.from(new Set(userRoleAssignments.map((assignment) => assignment.role_id)));
    const roles = roleIds.length > 0 ? await this.loadRoles(roleIds) : [];
    const authProfilesByAuthUserId = await this.loadAuthUserProfiles(
      users
        .map((user) => user.auth_user_id)
        .filter((authUserId): authUserId is string => Boolean(authUserId)),
    );
    const rolesById = new Map(roles.map((role) => [role.id, role]));

    const roleIdsByUserId = new Map<string, string[]>();
    for (const assignment of userRoleAssignments) {
      const currentRoleIds = roleIdsByUserId.get(assignment.user_id) ?? [];
      currentRoleIds.push(assignment.role_id);
      roleIdsByUserId.set(assignment.user_id, currentRoleIds);
    }

    const registerIdsByUserId = new Map<string, string[]>();
    for (const assignment of registerAssignments) {
      const currentRegisterIds = registerIdsByUserId.get(assignment.user_id) ?? [];
      currentRegisterIds.push(assignment.cash_register_id);
      registerIdsByUserId.set(assignment.user_id, currentRegisterIds);
    }

    return [...users]
      .sort((left, right) => left.display_name.localeCompare(right.display_name, "es"))
      .map((user) => {
        const roleIdsForUser = Array.from(new Set(roleIdsByUserId.get(user.id) ?? []));
        const rolesForUser = roleIdsForUser
          .map((roleId) => rolesById.get(roleId))
          .filter((role): role is RoleRow => Boolean(role))
          .sort(compareRoleOrder);

        return {
          userId: user.id,
          displayName: user.display_name,
          actorKind: user.actor_kind,
          isActive: user.is_active,
          roleIds: roleIdsForUser,
          roleCodes: rolesForUser.map((role) => role.code),
          roleNames: rolesForUser.map((role) => role.name),
          assignedRegisterIds: Array.from(
            new Set(registerIdsByUserId.get(user.id) ?? []),
          ).sort((left, right) => left.localeCompare(right, "es")),
          authUserId: user.auth_user_id ?? undefined,
          authEmail:
            user.auth_user_id
              ? authProfilesByAuthUserId.get(user.auth_user_id)?.email
              : undefined,
          authCredentialStatus:
            !user.auth_user_id
              ? "not_provisioned"
              : authProfilesByAuthUserId.get(user.auth_user_id)?.exists === false
                ? "stale_mapping"
                : "provisioned",
        };
      });
  }

  private async loadRoles(roleIds?: readonly string[]): Promise<readonly RoleRow[]> {
    let query = this.client
      .from("roles")
      .select(
        "id, code, name, description, is_system, is_locked, cloned_from_role_id, created_at, created_by_user_id, updated_at, updated_by_user_id",
      );

    if (roleIds && roleIds.length > 0) {
      query = query.in("id", [...roleIds]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load roles in Supabase: ${error.message}`);
    }

    return (data as readonly RoleRow[] | null) ?? [];
  }

  private async loadUsers(userIds?: readonly string[]): Promise<readonly AppUserRow[]> {
    let query = this.client
      .from("app_users")
      .select("id, auth_user_id, display_name, actor_kind, is_active");

    if (userIds && userIds.length > 0) {
      query = query.in("id", [...userIds]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load app users in Supabase: ${error.message}`);
    }

    return (data as readonly AppUserRow[] | null) ?? [];
  }

  private async loadAuthUserProfiles(
    authUserIds: readonly string[],
  ): Promise<Map<string, AuthUserProfile>> {
    const uniqueAuthUserIds = Array.from(new Set(authUserIds));
    if (uniqueAuthUserIds.length === 0) {
      return new Map();
    }

    const profiles = await Promise.all(
      uniqueAuthUserIds.map(async (authUserId) => {
        const profile = await this.loadAuthUserProfile(authUserId);
        return [authUserId, profile] as const;
      }),
    );

    return new Map(profiles);
  }

  private async loadAuthUserProfile(authUserId: string): Promise<AuthUserProfile> {
    const { data, error } = await this.client.auth.admin.getUserById(authUserId);
    if (error || !data.user) {
      return {
        authUserId,
        exists: false,
      };
    }

    return {
      authUserId,
      email:
        typeof data.user.email === "string" && data.user.email.trim().length > 0
          ? data.user.email.trim().toLowerCase()
          : undefined,
      exists: true,
    };
  }

  private async loadUserRoleAssignments(
    userIds?: readonly string[],
    roleIds?: readonly string[],
  ): Promise<readonly UserRoleAssignmentRow[]> {
    let query = this.client.from("user_role_assignments").select("user_id, role_id");

    if (userIds && userIds.length > 0) {
      query = query.in("user_id", [...userIds]);
    }

    if (roleIds && roleIds.length > 0) {
      query = query.in("role_id", [...roleIds]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load user role assignments in Supabase: ${error.message}`);
    }

    return (data as readonly UserRoleAssignmentRow[] | null) ?? [];
  }

  private async loadRolePermissionAssignments(
    roleIds: readonly string[],
  ): Promise<readonly RolePermissionAssignmentRow[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from("role_permission_assignments")
      .select("role_id, permission_id")
      .in("role_id", [...roleIds]);

    if (error) {
      throw new Error(`Failed to load role permissions in Supabase: ${error.message}`);
    }

    return (data as readonly RolePermissionAssignmentRow[] | null) ?? [];
  }

  private async loadPermissionsByIds(
    permissionIds: readonly string[],
  ): Promise<readonly PermissionRow[]> {
    if (permissionIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from("permissions")
      .select("id, code, name")
      .in("id", [...permissionIds]);

    if (error) {
      throw new Error(`Failed to load permissions in Supabase: ${error.message}`);
    }

    return (data as readonly PermissionRow[] | null) ?? [];
  }

  private async loadPermissionsByCodes(
    permissionCodes: readonly string[],
  ): Promise<readonly PermissionRow[]> {
    if (permissionCodes.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from("permissions")
      .select("id, code, name")
      .in("code", Array.from(new Set(permissionCodes)));

    if (error) {
      throw new Error(`Failed to load permissions in Supabase: ${error.message}`);
    }

    return (data as readonly PermissionRow[] | null) ?? [];
  }

  private async loadRegisterAssignments(
    userIds: readonly string[],
  ): Promise<readonly RegisterAssignmentRow[]> {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from("cash_register_user_assignments")
      .select("user_id, cash_register_id")
      .in("user_id", [...userIds]);

    if (error) {
      throw new Error(
        `Failed to load cash register user assignments in Supabase: ${error.message}`,
      );
    }

    return (data as readonly RegisterAssignmentRow[] | null) ?? [];
  }
}
