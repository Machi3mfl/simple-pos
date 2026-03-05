"use client";

import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  ShieldUser,
  UserRoundCog,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  readonly authUserId?: string;
  readonly authEmail?: string;
  readonly authCredentialStatus:
    | "not_provisioned"
    | "provisioned"
    | "stale_mapping";
}

interface AccessControlWorkspaceResponse {
  readonly roles: readonly AccessControlWorkspaceRole[];
  readonly users: readonly AccessControlWorkspaceUser[];
  readonly permissions: readonly AccessControlWorkspacePermission[];
  readonly permissionGroups: readonly AccessControlWorkspacePermissionGroup[];
}

interface UserAuthCredentialsResponse {
  readonly userId: string;
  readonly displayName: string;
  readonly authUserId: string;
  readonly authEmail: string;
  readonly wasCreated: boolean;
}

interface CreateAccessUserResponse {
  readonly userId: string;
  readonly displayName: string;
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

interface AdminModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly testId?: string;
  readonly maxWidthClassName?: string;
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
    neutral: "border-slate-200 bg-white text-slate-900",
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
        "rounded-2xl border px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
        toneClasses[tone],
      ].join(" ")}
    >
      <p
        className={[
          "text-[0.66rem] font-semibold uppercase tracking-[0.16em]",
          labelToneClasses[tone],
        ].join(" ")}
      >
        {label}
      </p>
      <p className="mt-2 text-[1.6rem] leading-none font-bold tracking-tight">{value}</p>
    </div>
  );
}

function AdminModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  testId,
  maxWidthClassName = "max-w-[64rem]",
}: AdminModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] md:p-4"
      onClick={onClose}
    >
      <div className="relative flex min-h-full items-center justify-center">
        <FloatingModalCloseButton ariaLabel="Cerrar" onClick={onClose} />

        <div
          role="dialog"
          aria-modal="true"
          data-testid={testId}
          className={[
            "flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[#fbfbfc] shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:max-h-[calc(100dvh-2rem)]",
            maxWidthClassName,
          ].join(" ")}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-200/80 px-5 py-4">
            <h3 className="text-[1.25rem] font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
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
  const [isSavingUserAuthCredentials, setIsSavingUserAuthCredentials] =
    useState<boolean>(false);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [selectedCatalogRoleId, setSelectedCatalogRoleId] = useState<string>("");
  const [roleDraft, setRoleDraft] = useState<RoleDraftState>(emptyRoleDraft);
  const [roleSearchTerm, setRoleSearchTerm] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<"all" | "base" | "custom">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [adminViewTab, setAdminViewTab] = useState<"roles" | "users">("roles");
  const [userFilter, setUserFilter] = useState<
    "all" | "with_auth" | "without_auth"
  >("all");
  const [userRoleDraftIds, setUserRoleDraftIds] = useState<readonly string[]>([]);
  const [userAuthEmailDraft, setUserAuthEmailDraft] = useState<string>("");
  const [userAuthPasswordDraft, setUserAuthPasswordDraft] = useState<string>("");
  const [isRoleComposerModalOpen, setIsRoleComposerModalOpen] =
    useState<boolean>(false);
  const [isRoleDeleteModalOpen, setIsRoleDeleteModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] =
    useState<boolean>(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);
  const [createUserDisplayNameDraft, setCreateUserDisplayNameDraft] =
    useState<string>("");
  const [createUserActorKindDraft, setCreateUserActorKindDraft] = useState<
    "human" | "system"
  >("human");
  const [createUserEmailDraft, setCreateUserEmailDraft] = useState<string>("");
  const [createUserPasswordDraft, setCreateUserPasswordDraft] = useState<string>("");
  const [createUserRoleDraftIds, setCreateUserRoleDraftIds] = useState<
    readonly string[]
  >([]);

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
      setUserAuthEmailDraft("");
      setUserAuthPasswordDraft("");
      return;
    }

    setUserRoleDraftIds(selectedUser.roleIds);
    setUserAuthEmailDraft(selectedUser.authEmail ?? "");
    setUserAuthPasswordDraft("");
  }, [selectedUser]);

  const filteredRoles = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const normalizedSearch = roleSearchTerm.trim().toLowerCase();

    return workspace.roles.filter((role) => {
      if (roleFilter === "base" && !role.isLocked) {
        return false;
      }

      if (roleFilter === "custom" && role.isLocked) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const haystack = [role.name, role.code, role.description ?? ""]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [roleFilter, roleSearchTerm, workspace]);

  const filteredUsers = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const normalizedSearch = userSearchTerm.trim().toLowerCase();

    return workspace.users.filter((user) => {
      if (userFilter === "with_auth" && user.authCredentialStatus !== "provisioned") {
        return false;
      }

      if (userFilter === "without_auth" && user.authCredentialStatus === "provisioned") {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const haystack = [
        user.displayName,
        user.authEmail ?? "",
        ...user.roleNames,
        ...user.roleCodes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [userFilter, userSearchTerm, workspace]);

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

  const permissionsByGroupCode = useMemo(() => {
    const groupedPermissions = new Map<string, AccessControlWorkspacePermission[]>();

    for (const permission of workspace?.permissions ?? []) {
      const currentGroupPermissions = groupedPermissions.get(permission.groupCode) ?? [];
      currentGroupPermissions.push(permission);
      groupedPermissions.set(permission.groupCode, currentGroupPermissions);
    }

    return groupedPermissions;
  }, [workspace?.permissions]);

  const canUpdateUserAssignments = canManageUsers;
  const canManageUserCredentials = canManageUsers;

  const selectedUserAuthStatusTone = useMemo(() => {
    switch (selectedUser?.authCredentialStatus) {
      case "provisioned":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "stale_mapping":
        return "border-amber-200 bg-amber-50 text-amber-700";
      default:
        return "border-slate-200 bg-slate-100 text-slate-600";
    }
  }, [selectedUser?.authCredentialStatus]);

  const selectedUserAuthStatusLabel = useMemo(() => {
    switch (selectedUser?.authCredentialStatus) {
      case "provisioned":
        return messages.usersAdmin.authProvisionedBadge;
      case "stale_mapping":
        return messages.usersAdmin.authStaleBadge;
      default:
        return messages.usersAdmin.authMissingBadge;
    }
  }, [
    messages.usersAdmin.authMissingBadge,
    messages.usersAdmin.authProvisionedBadge,
    messages.usersAdmin.authStaleBadge,
    selectedUser?.authCredentialStatus,
  ]);

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

  const handleToggleCreateUserRole = useCallback((roleId: string): void => {
    setCreateUserRoleDraftIds((currentRoleIds) => {
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
      setIsRoleComposerModalOpen(false);
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
      setIsRoleDeleteModalOpen(false);
      setIsRoleComposerModalOpen(false);
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

  const handleSaveAuthCredentials = useCallback(async (): Promise<void> => {
    if (!selectedUser) {
      return;
    }

    if (!canManageUserCredentials) {
      showInfoToast({
        title: "Acceso en solo lectura",
        description: messages.usersAdmin.assignmentReadOnlyHint,
      });
      return;
    }

    setIsSavingUserAuthCredentials(true);
    try {
      const { response, data } = await fetchJsonNoStore<UserAuthCredentialsResponse>(
        `/api/v1/access-control/users/${selectedUser.userId}/auth-credentials`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: userAuthEmailDraft.trim(),
            password: userAuthPasswordDraft.trim(),
          }),
        },
      );

      if (!response.ok || !data) {
        throw new Error(
          resolveApiMessage(
            data,
            "No se pudieron guardar las credenciales del usuario.",
          ),
        );
      }

      await loadWorkspace("refresh");
      await refreshActorSession();
      setUserAuthEmailDraft(data.authEmail);
      setUserAuthPasswordDraft("");
      showSuccessToast({
        title: data.wasCreated ? "Acceso creado" : "Acceso actualizado",
        description: data.wasCreated
          ? `Generaste credenciales reales para ${selectedUser.displayName}.`
          : `Actualizaste el acceso real de ${selectedUser.displayName}.`,
        testId: "users-admin-auth-save-success-toast",
      });
    } catch (error: unknown) {
      showErrorToast({
        title: "No se pudo guardar el acceso",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron guardar las credenciales del usuario.",
        testId: "users-admin-auth-save-error-toast",
      });
    } finally {
      setIsSavingUserAuthCredentials(false);
    }
  }, [
    canManageUserCredentials,
    loadWorkspace,
    messages.usersAdmin.assignmentReadOnlyHint,
    refreshActorSession,
    selectedUser,
    userAuthEmailDraft,
    userAuthPasswordDraft,
  ]);

  const handleCreateUser = useCallback(async (): Promise<void> => {
    if (!canManageUsers) {
      showInfoToast({
        title: "Alta en solo lectura",
        description: messages.usersAdmin.assignmentReadOnlyHint,
      });
      return;
    }

    const normalizedEmail = createUserEmailDraft.trim().toLowerCase();
    const normalizedPassword = createUserPasswordDraft.trim();
    const wantsCredentials =
      normalizedEmail.length > 0 || normalizedPassword.length > 0;

    if (
      wantsCredentials &&
      (normalizedEmail.length === 0 || normalizedPassword.length === 0)
    ) {
      showErrorToast({
        title: "Completá acceso inicial",
        description:
          "Si cargás credenciales en el alta, debés completar email y contraseña.",
      });
      return;
    }

    if (
      normalizedEmail.length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      showErrorToast({
        title: "Email inválido",
        description: "Ingresá un correo válido para crear el acceso inicial.",
      });
      return;
    }

    if (normalizedPassword.length > 0 && normalizedPassword.length < 8) {
      showErrorToast({
        title: "Contraseña inválida",
        description: "La contraseña inicial debe tener al menos 8 caracteres.",
      });
      return;
    }

    setIsCreatingUser(true);
    let createdUser: CreateAccessUserResponse | null = null;
    try {
      const { response, data } = await fetchJsonNoStore<CreateAccessUserResponse>(
        "/api/v1/access-control/users",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            displayName: createUserDisplayNameDraft.trim(),
            actorKind: createUserActorKindDraft,
            roleIds: createUserRoleDraftIds,
          }),
        },
      );

      if (!response.ok || !data) {
        throw new Error(resolveApiMessage(data, "No se pudo crear el usuario."));
      }

      createdUser = data;

      if (wantsCredentials) {
        const { response: authResponse, data: authData } =
          await fetchJsonNoStore<UserAuthCredentialsResponse>(
            `/api/v1/access-control/users/${data.userId}/auth-credentials`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                email: normalizedEmail,
                password: normalizedPassword,
              }),
            },
          );

        if (!authResponse.ok || !authData) {
          throw new Error(
            resolveApiMessage(
              authData,
              "Usuario creado, pero no se pudo generar el acceso inicial.",
            ),
          );
        }
      }

      await loadWorkspace("refresh");
      await refreshActorSession();
      setSelectedUserId(data.userId);
      setIsCreateUserModalOpen(false);
      setIsUserManagementModalOpen(true);
      setCreateUserDisplayNameDraft("");
      setCreateUserEmailDraft("");
      setCreateUserPasswordDraft("");
      setCreateUserRoleDraftIds([]);
      setCreateUserActorKindDraft("human");
      showSuccessToast({
        title: wantsCredentials ? "Usuario y acceso creados" : "Usuario creado",
        description: wantsCredentials
          ? `${data.displayName} ya tiene login real habilitado.`
          : `${data.displayName} ya está disponible para asignaciones.`,
      });
    } catch (error: unknown) {
      if (createdUser) {
        await loadWorkspace("refresh");
        await refreshActorSession();
        setSelectedUserId(createdUser.userId);
        setIsCreateUserModalOpen(false);
        setIsUserManagementModalOpen(true);
        showErrorToast({
          title: "Usuario creado con advertencia",
          description:
            error instanceof Error
              ? error.message
              : "Se creó el usuario, pero falló la creación del acceso inicial.",
        });
        return;
      }

      showErrorToast({
        title: "No se pudo crear el usuario",
        description:
          error instanceof Error ? error.message : "No se pudo crear el usuario.",
      });
    } finally {
      setIsCreatingUser(false);
    }
  }, [
    canManageUsers,
    createUserActorKindDraft,
    createUserDisplayNameDraft,
    createUserEmailDraft,
    createUserPasswordDraft,
    createUserRoleDraftIds,
    loadWorkspace,
    messages.usersAdmin.assignmentReadOnlyHint,
    refreshActorSession,
  ]);

  const openRoleComposerFromRole = useCallback((role: AccessControlWorkspaceRole): void => {
    setSelectedCatalogRoleId(role.id);
    setRoleDraft(toEditableRoleDraft(role));
    setIsRoleComposerModalOpen(true);
  }, []);

  const openUserManagementForUser = useCallback((userId: string): void => {
    setSelectedUserId(userId);
    setIsUserManagementModalOpen(true);
  }, []);

  if (isLoading) {
    return (
      <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-hidden lg:p-4">
        <div className="flex h-full min-h-0 items-center justify-center rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span className="text-sm font-medium">Cargando accesos...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 bg-[#f7f7f8] p-3 lg:col-span-2 lg:min-h-0 lg:overflow-hidden lg:p-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[98rem] flex-col gap-4">
        <article className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-[52rem]">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                POS-002
              </p>
              <h1 className="mt-1 text-[2rem] leading-none font-semibold tracking-tight text-slate-950">
                {messages.usersAdmin.title}
              </h1>
              <p className="mt-2 text-sm text-slate-600">{messages.usersAdmin.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateUserDisplayNameDraft("");
                  setCreateUserActorKindDraft("human");
                  setCreateUserEmailDraft("");
                  setCreateUserPasswordDraft("");
                  setCreateUserRoleDraftIds([]);
                  setIsCreateUserModalOpen(true);
                }}
                disabled={!canManageUsers}
                className="inline-flex min-h-[2.8rem] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="size-4" />
                Nuevo usuario
              </button>
              <button
                type="button"
                onClick={() => {
                  void loadWorkspace("refresh");
                }}
                className="inline-flex min-h-[2.8rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.2)]"
              >
                {isRefreshing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-4" aria-hidden />
                )}
                {messages.common.actions.refresh}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="rounded-[1.2rem] border border-slate-200 bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="inline-flex w-full rounded-[0.9rem] bg-slate-100 p-1">
              <button
                type="button"
                data-testid="users-admin-tab-roles"
                onClick={() => setAdminViewTab("roles")}
                className={[
                  "inline-flex min-h-[2.4rem] flex-1 items-center justify-center rounded-[0.7rem] px-3 text-sm font-semibold transition",
                  adminViewTab === "roles"
                    ? "bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-white shadow-[0_10px_20px_rgba(23,104,232,0.22)]"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Roles
              </button>
              <button
                type="button"
                data-testid="users-admin-tab-users"
                onClick={() => setAdminViewTab("users")}
                className={[
                  "inline-flex min-h-[2.4rem] flex-1 items-center justify-center rounded-[0.7rem] px-3 text-sm font-semibold transition",
                  adminViewTab === "users"
                    ? "bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-white shadow-[0_10px_20px_rgba(23,104,232,0.22)]"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Usuarios
              </button>
            </div>
          </div>

          {adminViewTab === "roles" ? (
            <article className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    {messages.usersAdmin.catalogTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {messages.usersAdmin.catalogDescription}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetToBlankRole();
                    setIsRoleComposerModalOpen(true);
                  }}
                  className="inline-flex min-h-[2.6rem] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  <Plus className="size-4" />
                  {messages.usersAdmin.newRoleAction}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="relative block w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={roleSearchTerm}
                    onChange={(event) => {
                      setRoleSearchTerm(event.target.value);
                    }}
                    placeholder="Buscar rol por nombre o código"
                    className="min-h-[2.5rem] rounded-xl border-slate-200 pl-10 text-sm"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setRoleFilter("all")}
                      className={[
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                        roleFilter === "all"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      ].join(" ")}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter("base")}
                      className={[
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                        roleFilter === "base"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      ].join(" ")}
                    >
                      Base
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter("custom")}
                      className={[
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                        roleFilter === "custom"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      ].join(" ")}
                    >
                      Custom
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    {filteredRoles.length} {filteredRoles.length === 1 ? "rol" : "roles"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredRoles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  No hay roles para el filtro actual.
                </div>
              ) : null}
              {filteredRoles.map((role) => {
                const isSelected = role.id === selectedCatalogRoleId;

                return (
                  <div
                    key={role.id}
                    data-testid={`users-admin-role-card-${role.id}`}
                    className={[
                      "rounded-xl border px-3 py-3 transition",
                      isSelected
                        ? "border-blue-200 bg-blue-50/70"
                        : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCatalogRoleId(role.id);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[1.1rem] font-semibold text-slate-950">
                            {role.name}
                          </p>
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold",
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
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {role.description ?? "Sin descripción."}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {messages.usersAdmin.permissionCount(role.permissionCodes.length)} ·{" "}
                          {role.assignedUserCount}{" "}
                          {role.assignedUserCount === 1 ? "usuario" : "usuarios"}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          openRoleComposerFromRole(role);
                        }}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                        aria-label={messages.usersAdmin.editAction}
                      >
                        {role.isLocked ? (
                          <ShieldCheck className="size-5" aria-hidden />
                        ) : (
                          <ShieldEllipsis className="size-5" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </article>
          ) : (
            <article className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    {messages.usersAdmin.usersTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {messages.usersAdmin.usersDescription}
                  </p>
                </div>
                <label className="relative block w-full md:max-w-[18rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={userSearchTerm}
                    onChange={(event) => {
                      setUserSearchTerm(event.target.value);
                    }}
                    placeholder={messages.usersAdmin.searchUsersPlaceholder}
                    className="min-h-[2.6rem] rounded-xl border-slate-200 pl-10 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setUserFilter("all")}
                    className={[
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                      userFilter === "all"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900",
                    ].join(" ")}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter("with_auth")}
                    className={[
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                      userFilter === "with_auth"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900",
                    ].join(" ")}
                  >
                    Con acceso
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter("without_auth")}
                    className={[
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                      userFilter === "without_auth"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900",
                    ].join(" ")}
                  >
                    Sin acceso
                  </button>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  {filteredUsers.length}{" "}
                  {filteredUsers.length === 1 ? "usuario" : "usuarios"}
                </p>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                  No hay usuarios para el filtro actual.
                </div>
              ) : null}
              {filteredUsers.map((user) => {
                const isSelected = user.userId === selectedUserId;

                return (
                  <div
                    key={user.userId}
                    data-testid={`users-admin-user-card-${user.userId}`}
                    className={[
                      "rounded-xl border px-3 py-3 transition",
                      isSelected
                        ? "border-blue-200 bg-blue-50/70"
                        : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user.userId);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[1.05rem] font-semibold text-slate-950">
                          {user.displayName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {user.roleNames.length > 0
                            ? user.roleNames.join(" · ")
                            : "Sin roles"}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          openUserManagementForUser(user.userId);
                        }}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                        aria-label="Gestionar usuario"
                      >
                        {user.actorKind === "system" ? (
                          <ShieldUser className="size-5" aria-hidden />
                        ) : (
                          <Users className="size-5" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </article>
          )}
        </div>

      </div>

      <AdminModal
        isOpen={isRoleComposerModalOpen}
        onClose={() => setIsRoleComposerModalOpen(false)}
        title={
          roleDraft.mode === "edit"
            ? messages.usersAdmin.editRoleTitle
            : messages.usersAdmin.createRoleTitle
        }
        description={
          selectedCatalogRole?.isLocked
            ? messages.usersAdmin.lockedRoleDescription
            : messages.usersAdmin.createRoleDescription
        }
        testId="users-admin-role-modal"
      >
        {!canManageRoles ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {messages.usersAdmin.managementReadOnlyHint}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            {messages.usersAdmin.roleNameLabel}
            <Input
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
              className="min-h-[2.8rem] rounded-xl border-slate-200 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            {messages.usersAdmin.roleDescriptionLabel}
            <Input
              value={roleDraft.description}
              onChange={(event) => {
                const nextDescription = event.target.value;
                setRoleDraft((currentDraft) => ({
                  ...currentDraft,
                  description: nextDescription,
                }));
              }}
              disabled={!canManageRoles}
              className="min-h-[2.8rem] rounded-xl border-slate-200 text-sm"
            />
          </label>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            {messages.usersAdmin.permissionGroupsTitle}
          </h4>

          <div className="mt-3 space-y-3">
            {workspace?.permissionGroups.map((group) => {
              const groupPermissions =
                permissionsByGroupCode.get(group.code) ?? [];
              const selectedCount = group.permissionCodes.filter((permissionCode) =>
                selectedPermissionCodes.has(permissionCode),
              ).length;
              const groupChecked =
                group.permissionCodes.length > 0 &&
                selectedCount === group.permissionCodes.length;

              return (
                <div
                  key={group.code}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                      <p className="text-xs text-slate-500">{group.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={groupChecked}
                        disabled={!canManageRoles}
                        onCheckedChange={() => {
                          handleToggleGroup(group);
                        }}
                      />
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedCount}/{group.permissionCodes.length}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            disabled={!canManageRoles}
                            className="inline-flex min-h-[2.2rem] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Permisos
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="w-[24rem] rounded-xl border-slate-200 bg-white p-3"
                        >
                          <div className="max-h-[18rem] space-y-1 overflow-y-auto pr-1">
                            {groupPermissions.map((permission) => (
                              <div
                                key={permission.code}
                                className="flex items-start gap-2 rounded-lg border border-slate-100 px-2 py-2"
                              >
                                <Checkbox
                                  checked={selectedPermissionCodes.has(permission.code)}
                                  disabled={!canManageRoles}
                                  onCheckedChange={() => {
                                    handleTogglePermission(permission.code);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleTogglePermission(permission.code);
                                  }}
                                  disabled={!canManageRoles}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="text-sm font-semibold text-slate-900">
                                    {permission.name}
                                  </p>
                                  <p className="text-[0.68rem] uppercase tracking-[0.12em] text-slate-400">
                                    {permission.code}
                                  </p>
                                </button>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {messages.usersAdmin.selectedPermissions}
          </p>
          {roleDraft.permissionCodes.length > 0 ? (
            <div className="mt-2 flex max-h-[7rem] flex-wrap gap-1.5 overflow-y-auto pr-1">
              {roleDraft.permissionCodes.map((permissionCode) => (
                <span
                  key={permissionCode}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-slate-600"
                >
                  {permissionCode}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              {messages.usersAdmin.noPermissionsSelected}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsRoleComposerModalOpen(false)}
            className="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            {messages.common.actions.cancel}
          </button>
          {roleDraft.mode === "edit" ? (
            <button
              type="button"
              onClick={() => setIsRoleDeleteModalOpen(true)}
              disabled={
                !canManageRoles ||
                isSavingRole ||
                (selectedCatalogRole?.assignedUserCount ?? 0) > 0
              }
              className="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {messages.usersAdmin.deleteRoleAction}
            </button>
          ) : null}
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
            className="inline-flex min-h-[2.6rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingRole ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {messages.usersAdmin.saveRoleAction}
          </button>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={isRoleDeleteModalOpen}
        onClose={() => setIsRoleDeleteModalOpen(false)}
        title="Eliminar rol custom"
        description="Esta acción elimina el rol seleccionado de forma permanente."
        testId="users-admin-delete-role-modal"
        maxWidthClassName="max-w-[30rem]"
      >
        <p className="text-sm text-slate-600">
          Confirmá la eliminación de{" "}
          <span className="font-semibold text-slate-900">{selectedCatalogRole?.name}</span>.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsRoleDeleteModalOpen(false)}
            className="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            {messages.common.actions.cancel}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleDeleteRole();
            }}
            disabled={isSavingRole}
            className="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {messages.usersAdmin.deleteRoleAction}
          </button>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        title={selectedUser ? selectedUser.displayName : "Gestionar usuario"}
        description="Administrá roles asignados y credenciales de acceso reales."
        testId="users-admin-user-modal"
      >
        {selectedUser ? (
          <>
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {messages.usersAdmin.userRolesLabel}
                </p>
                <p className="mt-1 text-sm text-slate-600">
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
                className="inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700"
              >
                <UserRoundCog className="size-4" aria-hidden />
                {messages.usersAdmin.tryRoleAction}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {messages.usersAdmin.authSectionTitle}
                </p>
                <span
                  data-testid="users-admin-auth-status"
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold",
                    selectedUserAuthStatusTone,
                  ].join(" ")}
                >
                  {selectedUserAuthStatusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {selectedUser.authEmail
                  ? `${messages.usersAdmin.authCurrentEmailLabel}: ${selectedUser.authEmail}`
                  : messages.usersAdmin.authMissingDescription}
              </p>
              {selectedUser.authCredentialStatus === "stale_mapping" ? (
                <p className="mt-1 text-xs text-amber-700">
                  {messages.usersAdmin.authStaleDescription}
                </p>
              ) : null}

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(11rem,0.8fr)]">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  {messages.usersAdmin.authEmailLabel}
                  <Input
                    data-testid="users-admin-auth-email-input"
                    type="email"
                    value={userAuthEmailDraft}
                    onChange={(event) => {
                      setUserAuthEmailDraft(event.target.value);
                    }}
                    disabled={!canManageUserCredentials || isSavingUserAuthCredentials}
                    placeholder="nombre@simple-pos.local"
                    className="min-h-[2.8rem] rounded-xl border-slate-200 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  {messages.usersAdmin.authPasswordLabel}
                  <Input
                    data-testid="users-admin-auth-password-input"
                    type="password"
                    value={userAuthPasswordDraft}
                    onChange={(event) => {
                      setUserAuthPasswordDraft(event.target.value);
                    }}
                    disabled={!canManageUserCredentials || isSavingUserAuthCredentials}
                    placeholder="********"
                    className="min-h-[2.8rem] rounded-xl border-slate-200 text-sm"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{messages.usersAdmin.authSectionHint}</p>
                <button
                  type="button"
                  data-testid="users-admin-save-auth-button"
                  onClick={() => {
                    void handleSaveAuthCredentials();
                  }}
                  disabled={
                    !canManageUserCredentials ||
                    isSavingUserAuthCredentials ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userAuthEmailDraft.trim()) ||
                    userAuthPasswordDraft.trim().length < 8
                  }
                  className="inline-flex min-h-[2.6rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingUserAuthCredentials ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {selectedUser.authCredentialStatus === "provisioned"
                    ? messages.usersAdmin.authUpdateAction
                    : messages.usersAdmin.authCreateAction}
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Roles asignados
              </p>
              <div className="mt-3 grid max-h-[16rem] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {workspace?.roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-start gap-2 rounded-lg border border-slate-100 px-2 py-2"
                  >
                    <Checkbox
                      checked={userRoleDraftIds.includes(role.id)}
                      disabled={!canUpdateUserAssignments || isSavingUserAssignments}
                      onCheckedChange={() => {
                        handleToggleUserRole(role.id);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleUserRole(role.id);
                      }}
                      disabled={!canUpdateUserAssignments || isSavingUserAssignments}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                      <p className="text-xs text-slate-500">
                        {role.description ?? "Sin descripción."}
                      </p>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUserManagementModalOpen(false)}
                className="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                {messages.common.actions.cancel}
              </button>
              <button
                type="button"
                data-testid="users-admin-save-user-roles-button"
                onClick={() => {
                  void handleSaveAssignments();
                }}
                disabled={!canUpdateUserAssignments || isSavingUserAssignments}
                className="inline-flex min-h-[2.6rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingUserAssignments ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {messages.usersAdmin.assignRolesAction}
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-sm text-slate-500">Seleccioná un usuario.</div>
        )}
      </AdminModal>

      <AdminModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Crear usuario"
        description="Alta de operador y, opcionalmente, provisión de acceso real en el mismo paso."
        testId="users-admin-create-user-modal"
        maxWidthClassName="max-w-[40rem]"
      >
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Nombre visible
            <Input
              value={createUserDisplayNameDraft}
              onChange={(event) => {
                setCreateUserDisplayNameDraft(event.target.value);
              }}
              placeholder="Ej. Cajera turno tarde"
              className="min-h-[2.8rem] rounded-xl border-slate-200 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Tipo de actor
            <select
              value={createUserActorKindDraft}
              onChange={(event) =>
                setCreateUserActorKindDraft(
                  event.target.value as "human" | "system",
                )
              }
              className="min-h-[2.8rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="human">Humano</option>
              <option value="system">Sistema</option>
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Email de acceso (opcional)
              <Input
                type="email"
                value={createUserEmailDraft}
                onChange={(event) => {
                  setCreateUserEmailDraft(event.target.value);
                }}
                placeholder="operador@simple-pos.local"
                className="min-h-[2.8rem] rounded-xl border-slate-200 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Contraseña inicial (opcional)
              <Input
                type="password"
                value={createUserPasswordDraft}
                onChange={(event) => {
                  setCreateUserPasswordDraft(event.target.value);
                }}
                placeholder="********"
                className="min-h-[2.8rem] rounded-xl border-slate-200 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Si completás uno, debés completar ambos. La contraseña requiere mínimo 8
            caracteres.
          </p>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Roles iniciales
            </p>
            <div className="mt-2 grid max-h-[14rem] gap-2 overflow-y-auto pr-1">
              {workspace?.roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-start gap-2 rounded-lg border border-slate-100 px-2 py-2"
                >
                  <Checkbox
                    checked={createUserRoleDraftIds.includes(role.id)}
                    onCheckedChange={() => {
                      handleToggleCreateUserRole(role.id);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleCreateUserRole(role.id);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                    <p className="text-xs text-slate-500">
                      {role.description ?? "Sin descripción."}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateUserModalOpen(false)}
              className="inline-flex min-h-[2.6rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              {messages.common.actions.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleCreateUser();
              }}
              disabled={
                isCreatingUser ||
                createUserDisplayNameDraft.trim().length < 3 ||
                ((createUserEmailDraft.trim().length > 0 ||
                  createUserPasswordDraft.trim().length > 0) &&
                  (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    createUserEmailDraft.trim().toLowerCase(),
                  ) ||
                    createUserPasswordDraft.trim().length < 8))
              }
              className="inline-flex min-h-[2.6rem] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3f8dff] to-[#1768e8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,104,232,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingUser ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Crear usuario
            </button>
          </div>
        </div>
      </AdminModal>
    </section>
  );
}
