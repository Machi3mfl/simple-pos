import type { CurrentActorSnapshot } from "@/modules/access-control/domain/types/PermissionSnapshot";

interface TutorialActorSnapshotOptions {
  readonly actorId: string;
  readonly displayName: string;
  readonly assignedRegisterIds: readonly string[];
  readonly supportControllerActorId?: string;
}

export function createTutorialActorSnapshot({
  actorId,
  displayName,
  assignedRegisterIds,
  supportControllerActorId = "user_admin_soporte",
}: TutorialActorSnapshotOptions): CurrentActorSnapshot {
  return {
    actor: {
      actorId,
      displayName,
      actorKind: "human",
      roleCodes: ["business_manager"],
      roleNames: ["Gerencia"],
      assignedRegisterIds: [...assignedRegisterIds],
    },
    session: {
      resolutionSource: "assumed_user",
      canAssumeUserBridge: true,
      supportControllerActorId,
    },
    permissionSnapshot: {
      permissionCodes: [
        "cash.movement.manual.record",
        "cash.session.close",
        "cash.session.close.override_discrepancy",
        "cash.session.open",
        "cash.session.open.backdate",
        "checkout.sale.create",
        "inventory.adjust_stock",
        "inventory.bulk_import",
        "inventory.cost.view",
        "inventory.value.view",
        "products.create_from_sourcing",
        "products.update_price",
        "products.view",
        "receivables.notes.view",
        "receivables.payment.register",
        "receivables.view",
        "reporting.credit_exposure.view",
        "reporting.executive.view",
        "reporting.margin.view",
        "sales_history.view",
        "sales_history.view_all_registers",
        "sync.view",
      ],
      navigation: {
        cashRegister: true,
        sales: true,
        receivables: true,
        products: true,
        reporting: true,
        sync: true,
        usersAdmin: false,
      },
      workspaces: {
        cashRegister: {
          canView: true,
          canCreateSale: true,
          canOpenSession: true,
          canBackdateSessionOpen: true,
          canCloseSession: true,
          canRecordManualCashMovement: true,
          canApproveDiscrepancyClose: true,
        },
        sales: {
          canView: true,
          canViewAllRegisters: true,
          canViewSaleDetail: true,
        },
        receivables: {
          canView: true,
          canRegisterPayment: true,
          canViewSensitiveNotes: true,
        },
        products: {
          canView: true,
          canCreateFromSourcing: true,
          canUpdatePrice: true,
          canAdjustStock: true,
          canRunBulkImport: true,
          canViewInventoryCost: true,
        },
        reporting: {
          canView: true,
          canViewExecutiveMetrics: true,
          canViewMargin: true,
          canViewInventoryValue: true,
          canViewCreditExposure: true,
        },
        sync: {
          canView: true,
        },
        usersAdmin: {
          canView: false,
          canAssignRoles: false,
          canManageUsers: false,
          canManageRoles: false,
        },
      },
      dataVisibility: {
        salesScope: "store",
        receivablesScope: "full",
        canViewInventoryCost: true,
        canViewProfitMetrics: true,
        canViewAuditMetadata: false,
      },
    },
  };
}
