import type { PermissionSnapshot } from "../types/PermissionSnapshot";

export function buildEmptyPermissionSnapshot(): PermissionSnapshot {
  return {
    permissionCodes: [],
    navigation: {
      cashRegister: false,
      sales: false,
      receivables: false,
      products: false,
      reporting: false,
      sync: false,
      usersAdmin: false,
    },
    workspaces: {
      cashRegister: {
        canView: false,
        canCreateSale: false,
        canOpenSession: false,
        canBackdateSessionOpen: false,
        canCloseSession: false,
        canRecordManualCashMovement: false,
        canApproveDiscrepancyClose: false,
      },
      sales: {
        canView: false,
        canViewAllRegisters: false,
        canViewSaleDetail: false,
      },
      receivables: {
        canView: false,
        canRegisterPayment: false,
        canViewSensitiveNotes: false,
      },
      products: {
        canView: false,
        canCreateFromSourcing: false,
        canUpdatePrice: false,
        canAdjustStock: false,
        canRunBulkImport: false,
        canViewInventoryCost: false,
      },
      reporting: {
        canView: false,
        canViewExecutiveMetrics: false,
        canViewMargin: false,
        canViewInventoryValue: false,
        canViewCreditExposure: false,
      },
      sync: {
        canView: false,
      },
      usersAdmin: {
        canView: false,
        canAssignRoles: false,
        canManageUsers: false,
        canManageRoles: false,
      },
    },
    dataVisibility: {
      salesScope: "none",
      receivablesScope: "none",
      canViewInventoryCost: false,
      canViewProfitMetrics: false,
      canViewAuditMetadata: false,
    },
  };
}
