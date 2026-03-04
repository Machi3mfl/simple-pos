import { z } from "zod";

export const navigationAccessDTOSchema = z
  .object({
    cashRegister: z.boolean(),
    sales: z.boolean(),
    receivables: z.boolean(),
    products: z.boolean(),
    reporting: z.boolean(),
    sync: z.boolean(),
    usersAdmin: z.boolean(),
  })
  .strict();

export const workspaceAccessDTOSchema = z
  .object({
    cashRegister: z
      .object({
        canView: z.boolean(),
        canCreateSale: z.boolean(),
        canOpenSession: z.boolean(),
        canCloseSession: z.boolean(),
        canRecordManualCashMovement: z.boolean(),
        canApproveDiscrepancyClose: z.boolean(),
      })
      .strict(),
    sales: z
      .object({
        canView: z.boolean(),
        canViewAllRegisters: z.boolean(),
        canViewSaleDetail: z.boolean(),
      })
      .strict(),
    receivables: z
      .object({
        canView: z.boolean(),
        canRegisterPayment: z.boolean(),
        canViewSensitiveNotes: z.boolean(),
      })
      .strict(),
    products: z
      .object({
        canView: z.boolean(),
        canCreateFromSourcing: z.boolean(),
        canUpdatePrice: z.boolean(),
        canAdjustStock: z.boolean(),
        canRunBulkImport: z.boolean(),
        canViewInventoryCost: z.boolean(),
      })
      .strict(),
    reporting: z
      .object({
        canView: z.boolean(),
        canViewExecutiveMetrics: z.boolean(),
        canViewMargin: z.boolean(),
        canViewInventoryValue: z.boolean(),
        canViewCreditExposure: z.boolean(),
      })
      .strict(),
    sync: z
      .object({
        canView: z.boolean(),
      })
      .strict(),
    usersAdmin: z
      .object({
        canView: z.boolean(),
        canAssignRoles: z.boolean(),
        canManageUsers: z.boolean(),
        canManageRoles: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const dataVisibilityDTOSchema = z
  .object({
    salesScope: z.enum(["none", "own_register", "assigned_registers", "store"]),
    receivablesScope: z.enum(["none", "summary_only", "full"]),
    canViewInventoryCost: z.boolean(),
    canViewProfitMetrics: z.boolean(),
    canViewAuditMetadata: z.boolean(),
  })
  .strict();

export const meResponseDTOSchema = z
  .object({
    actor: z
      .object({
        actorId: z.string().min(1),
        displayName: z.string().min(1),
        actorKind: z.enum(["human", "system"]),
        roleCodes: z.array(z.string().min(1)),
        roleNames: z.array(z.string().min(1)),
        assignedRegisterIds: z.array(z.string().min(1)),
      })
      .strict(),
    session: z
      .object({
        resolutionSource: z.enum([
          "authenticated",
          "authenticated_unmapped",
          "assumed_user",
          "default_actor",
        ]),
        authUserId: z.string().uuid().optional(),
        canAssumeUserBridge: z.boolean(),
        supportControllerActorId: z.string().min(1).optional(),
      })
      .strict(),
    permissionSnapshot: z
      .object({
        permissionCodes: z.array(z.string().min(1)),
        navigation: navigationAccessDTOSchema,
        workspaces: workspaceAccessDTOSchema,
        dataVisibility: dataVisibilityDTOSchema,
      })
      .strict(),
  })
  .strict();
