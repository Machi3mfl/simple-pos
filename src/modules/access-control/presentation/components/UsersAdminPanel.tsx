"use client";

import {
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  ShieldUser,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

import { useActorSession } from "../context/ActorSessionContext";

interface AccessControlWorkspacePermission {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly groupCode: string;
  readonly groupLabel: string;
  readonly groupDescription: string;
}

interface AccessControlWorkspacePermissionGroup {
  readonly code: string;
  readonly label: string;
  readonly description: string;
  readonly permissionCodes: readonly string[];
}

interface AccessControlWorkspaceRole {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly isSystem: boolean;
  readonly isLocked: boolean;
  readonly clonedFromRoleId?: string;
  readonly permissionCodes: readonly string[];
  readonly assignedUserCount: number;
  readonly createdAt: string;
  readonly createdByDisplayName?: string;
  readonly updatedAt: string;
  readonly updatedByDisplayName?: string;
}

interface AccessControlWorkspaceUser {
  readonly userId: string;
  readonly displayName: string;
  readonly actorKind: "human" | "system";
  readonly isActive: boolean;
  readonly roleIds: readonly string[];
  readonly roleCodes: readonly string[];
  readonly roleNames: readonly string[];
  readonly assignedRegisterIds: readonly string[];
}

interface AccessControlWorkspaceResponse {
  readonly roles: readonly AccessControlWorkspaceRole[];
  readonly users: readonly AccessControlWorkspaceUser[];
  readonly permissions: readonly AccessControlWorkspacePermission[];
  readonly permissionGroups: readonly AccessControlWorkspacePermissionGroup[];
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface UsersAdminPanelProps {
  readonly canManageRoles: boolean;
  readonly canManageUsers: boolean;
}

interface RoleDraftState {
  readonly mode: "blank" | "clone" | "edit";
  readonly roleId?: string;
  readonly clonedFromRoleId?: string;
  readonly name: string;
  readonly description: string;
  readonly permissionCodes: readonly string[];
}

interface AccessMetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly tone: "neutral" | "blue" | "emerald" | "amber";
}

const emptyRoleDraft: RoleDraftState = {
  mode: "blank",
  name: "",
  description: "",
  permissionCodes: [],
};

function resolveApiMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof (payload as ApiErrorPayload).message === "string"
  ) {
    return (payload as ApiErrorPayload).message as string;
  }

  return fallback;
}

function AccessMetricCard({
  label,
  value,
  tone,
}: AccessMetricCardProps): JSX.Element {
  const toneClasses: Record<AccessMetricCardProps["tone"], string> = {
    neutral: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-200 bg-blue-50/80 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    amber: "border-amber-200 bg-amber-50/90 text-amber-950",
  };
  const labelToneClasses: Record<AccessMetricCardProps["tone"], string> = {
    neutral: "text-slate-500",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };

  return (
    <div
      className={[
        "rounded-[1.85rem] border px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]",
        toneClasses[tone],
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-semibold uppercase tracking-[0.16em]",
          labelToneClasses[tone],
        ].join(" ")}
      >
        {label}
      </p>
      <p className="mt-2 text-[2.15rem] leading-none font-bold tracking-tight">{value}</p>
    </div>
  );
}

function toEditableRoleDraft(role: AccessControlWorkspaceRole): RoleDraftState {
  return {
    mode: role.isLocked ? "clone" : "edit",
    roleId: role.isLocked ? undefined : role.id,
    clonedFromRoleId: role.isLocked ? role.id : role.clonedFromRoleId,
    name: role.isLocked ? `${role.name} copia` : role.name,
    description: role.description ?? "",
    permissionCodes: role.permissionCodes,
  };
}

export function UsersAdminPanel({
  canManageRoles,
  canManageUsers,
}: UsersAdminPanelProps): JSX.Element {
  const { messages } = useI18n();
  const { switchActor, refreshActorSession } = useActorSession();
  const [workspace, setWorkspace] = useState<AccessControlWorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSavingRole, setIsSavingRole] = useState<boolean>(false);
  const [isSavingUserAssignments, setIsSavingUserAssignments] =
    useState<boolean>(false);
  const [selectedCatalogRoleId, setSelectedCatalogRoleId] = useState<string>("");
  const [roleDraft, setRoleDraft] = useState<RoleDraftState>(emptyRoleDraft);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [userRoleDraftIds, setUserRoleDraftIds] = useState<readonly string[]>([]);

  const loadWorkspace = useCallback(async (mode: "initial" | "refresh"): Promise<void> => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const { response, data } = await fetchJsonNoStore<AccessControlWorkspaceResponse>(
        "/api/v1/access-control/workspace",
      );

      if (!response.ok || !data) {
        throw new Error("No se pudo cargar el catálogo de accesos.");
      }

      setWorkspace(data);
      setSelectedCatalogRoleId((current) => {
        if (current && data.roles.some((role) => role.id === current)) {
          return current;
        }

        return data.roles[0]?.id ?? "";
      });
      setSelectedUserId((current) => {
        if (current && data.users.some((user) => user.userId === current)) {
          return current;
        }

        return data.users[0]?.userId ?? "";
      });
    } catch (error: unknown) {
      showErrorToast({
        title: "No se pudo cargar accesos",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catálogo de accesos.",
        testId: "users-admin-load-error-toast",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace("initial");
  }, [loadWorkspace]);

  const selectedCatalogRole = useMemo(
    () => workspace?.roles.find((role) => role.id === selectedCatalogRoleId) ?? null,
    [selectedCatalogRoleId, workspace?.roles],
  );
  const selectedUser = useMemo(
    () => workspace?.users.find((user) => user.userId === selectedUserId) ?? null,
    [selectedUserId, workspace?.users],
  );

  useEffect(() => {
    if (!selectedCatalogRole) {
      return;
    }

    setRoleDraft((currentDraft) => {
      if (currentDraft.roleId === selectedCatalogRole.id && currentDraft.mode === "edit") {
        return currentDraft;
      }

      if (
        currentDraft.clonedFromRoleId === selectedCatalogRole.id &&
        currentDraft.mode === "clone"
      ) {
        return currentDraft;
      }

      if (currentDraft.mode === "blank" && currentDraft.name.length > 0) {
        return currentDraft;
      }

      return toEditableRoleDraft(selectedCatalogRole);
    });
  }, [selectedCatalogRole]);

  useEffect(() => {
    if (!selectedUser) {
      setUserRoleDraftIds([]);
      return;
    }

    setUserRoleDraftIds(selectedUser.roleIds);
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const normalizedSearch = userSearchTerm.trim().toLowerCase();
    if (normalizedSearch.length === 0) {
      return workspace.users;
    }

    return workspace.users.filter((user) => {
      const haystack = [
        user.displayName,
        ...user.roleNames,
        ...user.roleCodes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [userSearchTerm, workspace]);

  const metrics = useMemo(() => {
    const roles = workspace?.roles ?? [];
    const users = workspace?.users ?? [];

    return {
      lockedRoles: roles.filter((role) => role.isLocked).length,
      customRoles: roles.filter((role) => !role.isLocked).length,
      activeUsers: users.filter((user) => user.isActive).length,
      permissions: workspace?.permissions.length ?? 0,
    };
  }, [workspace]);

  const selectedPermissionCodes = useMemo(
    () => new Set(roleDraft.permissionCodes),
    [roleDraft.permissionCodes],
  );

  const canUpdateUserAssignments = canManageUsers;

  const resetToBlankRole = useCallback((): void => {
    setSelectedCatalogRoleId("");
    setRoleDraft(emptyRoleDraft);
  }, []);

  const handleToggleGroup = useCallback(
    (group: AccessControlWorkspacePermissionGroup): void => {
      setRoleDraft((currentDraft) => {
        const currentCodes = new Set(currentDraft.permissionCodes);
        const groupIsFullySelected = group.permissionCodes.every((permissionCode) =>
          currentCodes.has(permissionCode),
        );

        if (groupIsFullySelected) {
          for (const permissionCode of group.permissionCodes) {
            currentCodes.delete(permissionCode);
          }
        } else {
          for (const permissionCode of group.permissionCodes) {
            currentCodes.add(permissionCode);
          }
        }

        return {
          ...currentDraft,
          permissionCodes: Array.from(currentCodes).sort((left, right) =>
            left.localeCompare(right, "es"),
          ),
        };
      });
    },
    [],
  );

  const handleTogglePermission = useCallback((permissionCode: string): void => {
    setRoleDraft((currentDraft) => {
      const currentCodes = new Set(currentDraft.permissionCodes);
      if (currentCodes.has(permissionCode)) {
        currentCodes.delete(permissionCode);
      } else {
        currentCodes.add(permissionCode);
      }

      return {
        ...currentDraft,
        permissionCodes: Array.from(currentCodes).sort((left, right) =>
          left.localeCompare(right, "es"),
        ),
      };
    });
  }, []);

  const handleToggleUserRole = useCallback((roleId: string): void => {
    setUserRoleDraftIds((currentRoleIds) => {
      const nextRoleIds = currentRoleIds.includes(roleId)
        ? currentRoleIds.filter((currentRoleId) => currentRoleId !== roleId)
        : [...currentRoleIds, roleId];

      return [...nextRoleIds].sort((left, right) => left.localeCompare(right, "es"));
    });
  }, []);

  const handlePersistRole = useCallback(async (): Promise<void> => {
    if (!canManageRoles) {
      showInfoToast({
        title: "Rol en solo lectura",
        description: messages.usersAdmin.managementReadOnlyHint,
      });
      return;
    }

    setIsSavingRole(true);
    try {
      const payload = {
        name: roleDraft.name.trim(),
        description: roleDraft.description.trim() || undefined,
        permissionCodes: roleDraft.permissionCodes,
        clonedFromRoleId: roleDraft.clonedFromRoleId,
      };
      const isEdit = roleDraft.mode === "edit" && roleDraft.roleId;
      const { response, data } = await fetchJsonNoStore<AccessControlWorkspaceRole>(
        isEdit
          ? `/api/v1/access-control/roles/${roleDraft.roleId}`
          : "/api/v1/access-control/roles",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok || !data) {
        throw new Error(
          resolveApiMessage(data, "No se pudo guardar la definición del rol."),
        );
      }

      await loadWorkspace("refresh");
      await refreshActorSession();
      setSelectedCatalogRoleId(data.id);
      setRoleDraft(toEditableRoleDraft(data));
      showSuccessToast({
        title: isEdit ? "Rol actualizado" : "Rol creado",
        description: `Se guardó ${data.name} con el bundle actual de permisos.`,
        testId: "users-admin-role-save-success-toast",
      });
    } catch (error: unknown) {
      showErrorToast({
        title: "No se pudo guardar el rol",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la definición del rol.",
        testId: "users-admin-role-save-error-toast",
      });
    } finally {
      setIsSavingRole(false);
    }
  }, [
    canManageRoles,
    loadWorkspace,
    messages.usersAdmin.managementReadOnlyHint,
    refreshActorSession,
    roleDraft,
  ]);

  const handleDeleteRole = useCallback(async (): Promise<void> => {
    if (!roleDraft.roleId || roleDraft.mode !== "edit") {
      return;
    }

    setIsSavingRole(true);
    try {
      const { response, data } = await fetchJsonNoStore<{ readonly ok: boolean }>(
        `/api/v1/access-control/roles/${roleDraft.roleId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(resolveApiMessage(data, "No se pudo eliminar el rol."));
      }

      await loadWorkspace("refresh");
      await refreshActorSession();
      resetToBlankRole();
      showSuccessToast({
        title: "Rol eliminado",
        description: "El rol custom se eliminó del catálogo.",
        testId: "users-admin-role-delete-success-toast",
      });
    } catch (error: unknown) {
      showErrorToast({
        title: "No se pudo eliminar el rol",
        description:
          error instanceof Error ? error.message : "No se pudo eliminar el rol.",
        testId: "users-admin-role-delete-error-toast",
      });
    } finally {
      setIsSavingRole(false);
    }
  }, [loadWorkspace, refreshActorSession, resetToBlankRole, roleDraft]);

  const handleSaveAssignments = useCallback(async (): Promise<void> => {
    if (!selectedUser) {
      return;
    }

    if (!canUpdateUserAssignments) {
      showInfoToast({
        title: "Asignación en solo lectura",
        description: messages.usersAdmin.assignmentReadOnlyHint,
      });
      return;
    }

    setIsSavingUserAssignments(true);
    try {
      const { response, data } = await fetchJsonNoStore<{ readonly ok: boolean }>(
        `/api/v1/access-control/users/${selectedUser.userId}/roles`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            roleIds: userRoleDraftIds,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          resolveApiMessage(data, "No se pudieron actualizar los roles del usuario."),
        );
      }

      await loadWorkspace("refresh");
      await refreshActorSession();
      showSuccessToast({
        title: "Asignación guardada",
        description: `Actualizaste los roles de ${selectedUser.displayName}.`,
        testId: "users-admin-user-assignment-success-toast",
      });
    } catch (error: unknown) {
      showErrorToast({
        title: "No se pudo guardar la asignación",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron actualizar los roles del usuario.",
        testId: "users-admin-user-assignment-error-toast",
      });
    } finally {
      setIsSavingUserAssignments(false);
    }
  }, [
    canUpdateUserAssignments,
    loadWorkspace,
    messages.usersAdmin.assignmentReadOnlyHint,
    refreshActorSession,
    selectedUser,
    userRoleDraftIds,
  ]);

  if (isLoading) {
    return (
      <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
        <div className="flex min-h-[calc(100dvh-6rem)] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span className="text-base font-medium">Cargando accesos...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
      <div className="mx-auto flex w-full max-w-[98rem] flex-col gap-6">
        <article className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-[52rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                POS-002
              </p>
              <h1 className="mt-2 text-[2.6rem] leading-none font-semibold tracking-tight text-slate-950 md:text-[4rem]">
                {messages.usersAdmin.title}
              </h1>
              <p className="mt-4 max-w-[46rem] text-base text-slate-600 md:text-[1.12rem]">
                {messages.usersAdmin.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadWorkspace("refresh");
              }}
              className="inline-flex min-h-[4.35rem] items-center justify-center gap-3 rounded-[1.55rem] bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-6 text-[1.18rem] font-semibold text-white shadow-[0_18px_30px_rgba(23,104,232,0.24)]"
            >
              {isRefreshing ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-5" aria-hidden />
              )}
              {messages.common.actions.refresh}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AccessMetricCard
              label={messages.usersAdmin.metrics.lockedRoles}
              value={`${metrics.lockedRoles}`}
              tone="neutral"
            />
            <AccessMetricCard
              label={messages.usersAdmin.metrics.customRoles}
              value={`${metrics.customRoles}`}
              tone="blue"
            />
            <AccessMetricCard
              label={messages.usersAdmin.metrics.activeUsers}
              value={`${metrics.activeUsers}`}
              tone="emerald"
            />
            <AccessMetricCard
              label={messages.usersAdmin.metrics.permissions}
              value={`${metrics.permissions}`}
              tone="amber"
            />
          </div>
        </article>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
                  {messages.usersAdmin.catalogTitle}
                </h2>
                <p className="mt-2 max-w-[26rem] text-sm text-slate-600">
                  {messages.usersAdmin.catalogDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={resetToBlankRole}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                {messages.usersAdmin.newRoleAction}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {workspace?.roles.map((role) => {
                const isSelected = role.id === selectedCatalogRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    data-testid={`users-admin-role-card-${role.id}`}
                    onClick={() => {
                      setSelectedCatalogRoleId(role.id);
                      setRoleDraft(toEditableRoleDraft(role));
                    }}
                    className={[
                      "rounded-[1.5rem] border px-4 py-4 text-left transition",
                      isSelected
                        ? "border-blue-200 bg-blue-50/70 shadow-[0_12px_30px_rgba(47,107,255,0.14)]"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-lg font-semibold text-slate-950">
                            {role.name}
                          </p>
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                              role.isLocked
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-blue-200 bg-blue-50 text-blue-700",
                            ].join(" ")}
                          >
                            {role.isLocked
                              ? messages.usersAdmin.presetsBadge
                              : messages.usersAdmin.customBadge}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {role.description ?? "Sin descripción."}
                        </p>
                      </div>
                      <div
                        className={[
                          "flex size-12 shrink-0 items-center justify-center rounded-2xl border",
                          role.isLocked
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-blue-200 bg-blue-100 text-blue-700",
                        ].join(" ")}
                      >
                        {role.isLocked ? (
                          <ShieldCheck className="size-6" aria-hidden />
                        ) : (
                          <ShieldEllipsis className="size-6" aria-hidden />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{messages.usersAdmin.permissionCount(role.permissionCodes.length)}</span>
                      <span>
                        {role.assignedUserCount}{" "}
                        {role.assignedUserCount === 1 ? "usuario" : "usuarios"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
                  {roleDraft.mode === "edit"
                    ? messages.usersAdmin.editRoleTitle
                    : messages.usersAdmin.createRoleTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {selectedCatalogRole?.isLocked
                    ? messages.usersAdmin.lockedRoleDescription
                    : messages.usersAdmin.createRoleDescription}
                </p>
              </div>
              {selectedCatalogRole?.isLocked ? (
                <button
                  type="button"
                  onClick={() => {
                    setRoleDraft(toEditableRoleDraft(selectedCatalogRole));
                  }}
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700"
                >
                  {messages.usersAdmin.cloneAction}
                </button>
              ) : null}
            </div>

            {!canManageRoles ? (
              <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {messages.usersAdmin.managementReadOnlyHint}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                {messages.usersAdmin.roleNameLabel}
                <input
                  data-testid="users-admin-role-name-input"
                  value={roleDraft.name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setRoleDraft((currentDraft) => ({
                      ...currentDraft,
                      name: nextName,
                    }));
                  }}
                  disabled={!canManageRoles}
                  className="min-h-[3.25rem] rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-blue-300"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                {messages.usersAdmin.roleDescriptionLabel}
                <input
                  value={roleDraft.description}
                  onChange={(event) => {
                    const nextDescription = event.target.value;
                    setRoleDraft((currentDraft) => ({
                      ...currentDraft,
                      description: nextDescription,
                    }));
                  }}
                  disabled={!canManageRoles}
                  className="min-h-[3.25rem] rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-blue-300"
                />
              </label>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-950">
                {messages.usersAdmin.permissionGroupsTitle}
              </h3>
              <div className="mt-4 flex flex-col gap-4">
                {workspace?.permissionGroups.map((group) => {
                  const groupPermissions = workspace.permissions.filter(
                    (permission) => permission.groupCode === group.code,
                  );
                  const selectedCount = group.permissionCodes.filter((permissionCode) =>
                    selectedPermissionCodes.has(permissionCode),
                  ).length;
                  const groupChecked =
                    group.permissionCodes.length > 0 &&
                    selectedCount === group.permissionCodes.length;

                  return (
                    <div
                      key={group.code}
                      className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-950">
                            {group.label}
                          </p>
                          <p className="mt-1 max-w-[36rem] text-sm text-slate-600">
                            {group.description}
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={groupChecked}
                            disabled={!canManageRoles}
                            onChange={() => {
                              handleToggleGroup(group);
                            }}
                          />
                          {selectedCount}/{group.permissionCodes.length}
                        </label>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {groupPermissions.map((permission) => (
                          <label
                            key={permission.code}
                            className="flex items-start gap-3 rounded-2xl border border-white bg-white px-3 py-3 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissionCodes.has(permission.code)}
                              disabled={!canManageRoles}
                              onChange={() => {
                                handleTogglePermission(permission.code);
                              }}
                            />
                            <span>
                              <span className="block font-semibold text-slate-900">
                                {permission.name}
                              </span>
                              <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                                {permission.code}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                {messages.usersAdmin.selectedPermissions}
              </p>
              {roleDraft.permissionCodes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {roleDraft.permissionCodes.map((permissionCode) => (
                    <span
                      key={permissionCode}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {permissionCode}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {messages.usersAdmin.noPermissionsSelected}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                data-testid="users-admin-save-role-button"
                onClick={() => {
                  void handlePersistRole();
                }}
                disabled={
                  !canManageRoles ||
                  roleDraft.name.trim().length < 3 ||
                  roleDraft.permissionCodes.length === 0 ||
                  isSavingRole
                }
                className="inline-flex min-h-[3.35rem] items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingRole ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {messages.usersAdmin.saveRoleAction}
              </button>
              {roleDraft.mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteRole();
                  }}
                  disabled={
                    !canManageRoles ||
                    isSavingRole ||
                    (selectedCatalogRole?.assignedUserCount ?? 0) > 0
                  }
                  className="inline-flex min-h-[3.35rem] items-center justify-center rounded-[1.25rem] border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {messages.usersAdmin.deleteRoleAction}
                </button>
              ) : null}
            </div>
          </article>
        </div>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950">
                {messages.usersAdmin.usersTitle}
              </h2>
              <p className="mt-2 max-w-[42rem] text-sm text-slate-600">
                {messages.usersAdmin.usersDescription}
              </p>
            </div>
            <label className="relative block w-full max-w-[24rem]">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearchTerm}
                onChange={(event) => {
                  setUserSearchTerm(event.target.value);
                }}
                placeholder={messages.usersAdmin.searchUsersPlaceholder}
                className="min-h-[3.25rem] w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-300"
              />
            </label>
          </div>

          {!canUpdateUserAssignments ? (
            <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {messages.usersAdmin.assignmentReadOnlyHint}
            </div>
          ) : null}

          <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col gap-3">
              {filteredUsers.map((user) => {
                const isSelected = user.userId === selectedUserId;

                return (
                  <button
                    key={user.userId}
                    type="button"
                    data-testid={`users-admin-user-card-${user.userId}`}
                    onClick={() => {
                      setSelectedUserId(user.userId);
                    }}
                    className={[
                      "rounded-[1.4rem] border px-4 py-4 text-left transition",
                      isSelected
                        ? "border-blue-200 bg-blue-50/70 shadow-[0_12px_30px_rgba(47,107,255,0.14)]"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-slate-950">
                          {user.displayName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {user.roleNames.length > 0
                            ? user.roleNames.join(" · ")
                            : "Sin roles"}
                        </p>
                      </div>
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                        {user.actorKind === "system" ? (
                          <ShieldUser className="size-6" aria-hidden />
                        ) : (
                          <Users className="size-6" aria-hidden />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/60 px-4 py-4">
              {selectedUser ? (
                <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {messages.usersAdmin.userRolesLabel}
                      </p>
                      <h3 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-slate-950">
                        {selectedUser.displayName}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedUser.assignedRegisterIds.length > 0
                          ? `${selectedUser.assignedRegisterIds.length} caja(s) asignada(s)`
                          : "Sin caja asignada"}
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="users-admin-try-user-button"
                      onClick={() => {
                        void switchActor(selectedUser.userId);
                      }}
                      className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700"
                    >
                      <UserRoundCog className="size-4" aria-hidden />
                      {messages.usersAdmin.tryRoleAction}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {workspace?.roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-start gap-3 rounded-[1.2rem] border border-white bg-white px-4 py-4 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={userRoleDraftIds.includes(role.id)}
                          disabled={!canUpdateUserAssignments || isSavingUserAssignments}
                          onChange={() => {
                            handleToggleUserRole(role.id);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-950">
                            {role.name}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {role.description ?? "Sin descripción."}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      data-testid="users-admin-save-user-roles-button"
                      onClick={() => {
                        void handleSaveAssignments();
                      }}
                      disabled={!canUpdateUserAssignments || isSavingUserAssignments}
                      className="inline-flex min-h-[3.35rem] items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingUserAssignments ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      {messages.usersAdmin.assignRolesAction}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[22rem] flex-col items-center justify-center text-center">
                  <ShieldUser className="size-12 text-slate-300" aria-hidden />
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                    {messages.usersAdmin.noUserSelectedTitle}
                  </h3>
                  <p className="mt-3 max-w-[28rem] text-sm text-slate-600">
                    {messages.usersAdmin.noUserSelectedDescription}
                  </p>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
