import type { ActorAccessRecord } from "../repositories/ActorAccessRepository";
import type { PermissionSnapshot } from "../types/PermissionSnapshot";

function hasPermission(
  permissionCodes: ReadonlySet<string>,
  permissionCode: string,
): boolean {
  return permissionCodes.has(permissionCode);
}

export function buildPermissionSnapshot(
  actorAccess: ActorAccessRecord,
): PermissionSnapshot {
  const permissionCodes = Array.from(new Set(actorAccess.permissionCodes)).sort();
  const permissionSet = new Set(permissionCodes);

  const canViewCashRegister =
    hasPermission(permissionSet, "checkout.sale.create") ||
    hasPermission(permissionSet, "cash.session.open") ||
    hasPermission(permissionSet, "cash.session.close") ||
    hasPermission(permissionSet, "cash.movement.manual.record");
  const canViewSales =
    hasPermission(permissionSet, "sales_history.view") ||
    hasPermission(permissionSet, "sales_history.view_all_registers");
  const canViewReceivables = hasPermission(permissionSet, "receivables.view");
  const canViewProducts = hasPermission(permissionSet, "products.view");
  const canViewReporting =
    hasPermission(permissionSet, "reporting.executive.view") ||
    hasPermission(permissionSet, "reporting.operational.view");
  const canViewSync = hasPermission(permissionSet, "sync.view");
  const canViewUsersAdmin =
    hasPermission(permissionSet, "users.manage") ||
    hasPermission(permissionSet, "roles.assign");
  const canViewInventoryCost = hasPermission(permissionSet, "inventory.cost.view");
  const canViewProfitMetrics = hasPermission(permissionSet, "reporting.margin.view");
  const canViewAuditMetadata = hasPermission(permissionSet, "audit.view");

  return {
    permissionCodes,
    navigation: {
      cashRegister: canViewCashRegister,
      sales: canViewSales,
      receivables: canViewReceivables,
      products: canViewProducts,
      reporting: canViewReporting,
      sync: canViewSync,
      usersAdmin: canViewUsersAdmin,
    },
    workspaces: {
      cashRegister: {
        canView: canViewCashRegister,
        canCreateSale: hasPermission(permissionSet, "checkout.sale.create"),
        canOpenSession: hasPermission(permissionSet, "cash.session.open"),
        canCloseSession: hasPermission(permissionSet, "cash.session.close"),
        canRecordManualCashMovement: hasPermission(
          permissionSet,
          "cash.movement.manual.record",
        ),
      },
      sales: {
        canView: canViewSales,
        canViewAllRegisters: hasPermission(
          permissionSet,
          "sales_history.view_all_registers",
        ),
        canViewSaleDetail: hasPermission(
          permissionSet,
          "sales_history.view_all_registers",
        ),
      },
      receivables: {
        canView: canViewReceivables,
        canRegisterPayment: hasPermission(
          permissionSet,
          "receivables.payment.register",
        ),
        canViewSensitiveNotes: hasPermission(permissionSet, "receivables.notes.view"),
      },
      products: {
        canView: canViewProducts,
        canCreateFromSourcing: hasPermission(
          permissionSet,
          "products.create_from_sourcing",
        ),
        canUpdatePrice: hasPermission(permissionSet, "products.update_price"),
        canAdjustStock: hasPermission(permissionSet, "inventory.adjust_stock"),
        canRunBulkImport: hasPermission(permissionSet, "inventory.bulk_import"),
        canViewInventoryCost,
      },
      reporting: {
        canView: canViewReporting,
        canViewExecutiveMetrics: hasPermission(
          permissionSet,
          "reporting.executive.view",
        ),
        canViewMargin: hasPermission(permissionSet, "reporting.margin.view"),
        canViewInventoryValue: hasPermission(
          permissionSet,
          "inventory.value.view",
        ),
        canViewCreditExposure: hasPermission(
          permissionSet,
          "reporting.credit_exposure.view",
        ),
      },
      sync: {
        canView: canViewSync,
      },
      usersAdmin: {
        canView: canViewUsersAdmin,
        canAssignRoles: hasPermission(permissionSet, "roles.assign"),
        canManageUsers: hasPermission(permissionSet, "users.manage"),
      },
    },
    dataVisibility: {
      salesScope: hasPermission(permissionSet, "sales_history.view_all_registers")
        ? "store"
        : canViewSales
          ? actorAccess.assignedRegisterIds.length > 1
            ? "assigned_registers"
            : actorAccess.assignedRegisterIds.length === 1
              ? "own_register"
              : "none"
          : "none",
      receivablesScope: hasPermission(permissionSet, "receivables.notes.view")
        ? "full"
        : canViewReceivables
          ? "summary_only"
          : "none",
      canViewInventoryCost,
      canViewProfitMetrics,
      canViewAuditMetadata,
    },
  };
}
