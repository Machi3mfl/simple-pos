import type { AppUserKind } from "../entities/AppUser";

export interface NavigationAccessSnapshot {
  readonly cashRegister: boolean;
  readonly sales: boolean;
  readonly receivables: boolean;
  readonly products: boolean;
  readonly reporting: boolean;
  readonly sync: boolean;
  readonly usersAdmin: boolean;
}

export interface WorkspaceAccessSnapshot {
  readonly cashRegister: {
    readonly canView: boolean;
    readonly canCreateSale: boolean;
    readonly canOpenSession: boolean;
    readonly canCloseSession: boolean;
    readonly canRecordManualCashMovement: boolean;
    readonly canApproveDiscrepancyClose: boolean;
  };
  readonly sales: {
    readonly canView: boolean;
    readonly canViewAllRegisters: boolean;
    readonly canViewSaleDetail: boolean;
  };
  readonly receivables: {
    readonly canView: boolean;
    readonly canRegisterPayment: boolean;
    readonly canViewSensitiveNotes: boolean;
  };
  readonly products: {
    readonly canView: boolean;
    readonly canCreateFromSourcing: boolean;
    readonly canUpdatePrice: boolean;
    readonly canAdjustStock: boolean;
    readonly canRunBulkImport: boolean;
    readonly canViewInventoryCost: boolean;
  };
  readonly reporting: {
    readonly canView: boolean;
    readonly canViewExecutiveMetrics: boolean;
    readonly canViewMargin: boolean;
    readonly canViewInventoryValue: boolean;
    readonly canViewCreditExposure: boolean;
  };
  readonly sync: {
    readonly canView: boolean;
  };
  readonly usersAdmin: {
    readonly canView: boolean;
    readonly canAssignRoles: boolean;
    readonly canManageUsers: boolean;
    readonly canManageRoles: boolean;
  };
}

export interface DataVisibilitySnapshot {
  readonly salesScope: "none" | "own_register" | "assigned_registers" | "store";
  readonly receivablesScope: "none" | "summary_only" | "full";
  readonly canViewInventoryCost: boolean;
  readonly canViewProfitMetrics: boolean;
  readonly canViewAuditMetadata: boolean;
}

export interface PermissionSnapshot {
  readonly permissionCodes: readonly string[];
  readonly navigation: NavigationAccessSnapshot;
  readonly workspaces: WorkspaceAccessSnapshot;
  readonly dataVisibility: DataVisibilitySnapshot;
}

export interface ActorIdentitySnapshot {
  readonly actorId: string;
  readonly displayName: string;
  readonly actorKind: AppUserKind;
  readonly roleCodes: readonly string[];
  readonly roleNames: readonly string[];
  readonly assignedRegisterIds: readonly string[];
}

export type ActorSessionResolutionSource =
  | "authenticated"
  | "authenticated_unmapped"
  | "assumed_user"
  | "default_actor";

export interface ActorSessionSnapshot {
  readonly resolutionSource: ActorSessionResolutionSource;
  readonly authUserId?: string;
  readonly canAssumeUserBridge: boolean;
}

export interface CurrentActorSnapshot {
  readonly actor: ActorIdentitySnapshot;
  readonly session: ActorSessionSnapshot;
  readonly permissionSnapshot: PermissionSnapshot;
}

export interface SelectableActorSummary {
  readonly actorId: string;
  readonly displayName: string;
  readonly roleCodes: readonly string[];
  readonly roleNames: readonly string[];
  readonly assignedRegisterIds: readonly string[];
}
