import { AppUser } from "../../domain/entities/AppUser";
import type { ActorAccessRecord } from "../../domain/repositories/ActorAccessRepository";

const now = new Date("2026-03-03T00:00:00.000Z");

function createFallbackActor(input: {
  readonly id: string;
  readonly displayName: string;
  readonly roleCodes: readonly string[];
  readonly roleNames: readonly string[];
  readonly permissionCodes: readonly string[];
  readonly assignedRegisterIds?: readonly string[];
}): ActorAccessRecord {
  return {
    user: AppUser.create({
      id: input.id,
      displayName: input.displayName,
      actorKind: "human",
      isActive: true,
      createdAt: now,
    }),
    roleCodes: input.roleCodes,
    roleNames: input.roleNames,
    permissionCodes: input.permissionCodes,
    assignedRegisterIds: input.assignedRegisterIds ?? [],
  };
}

export const fallbackActorAccessRecords: readonly ActorAccessRecord[] = [
  createFallbackActor({
    id: "user_cashier_putri",
    displayName: "Putri",
    roleCodes: ["cashier"],
    roleNames: ["Cajera"],
    permissionCodes: [
      "checkout.sale.create",
      "cash.session.open",
      "cash.session.close",
      "sales_history.view",
      "sync.view",
    ],
    assignedRegisterIds: ["front-counter"],
  }),
  createFallbackActor({
    id: "user_collections_marta",
    displayName: "Marta",
    roleCodes: ["collections_clerk"],
    roleNames: ["Cobranzas"],
    permissionCodes: [
      "receivables.view",
      "receivables.payment.register",
      "receivables.notes.view",
    ],
  }),
  createFallbackActor({
    id: "user_supervisor_bruno",
    displayName: "Bruno",
    roleCodes: ["shift_supervisor"],
    roleNames: ["Supervisor de turno"],
    permissionCodes: [
      "checkout.sale.create",
      "cash.session.open",
      "cash.session.open.backdate",
      "cash.session.close",
      "cash.session.close.override_discrepancy",
      "cash.movement.manual.record",
      "sales_history.view",
      "sales_history.view_all_registers",
      "receivables.view",
      "receivables.payment.register",
      "reporting.operational.view",
      "sync.view",
    ],
    assignedRegisterIds: ["front-counter"],
  }),
  createFallbackActor({
    id: "user_catalog_lucia",
    displayName: "Lucía",
    roleCodes: ["catalog_manager"],
    roleNames: ["Gestión de productos"],
    permissionCodes: [
      "products.view",
      "products.create_from_sourcing",
      "products.update_price",
      "inventory.adjust_stock",
      "inventory.bulk_import",
      "inventory.cost.view",
      "inventory.value.view",
    ],
  }),
  createFallbackActor({
    id: "user_manager_maxi",
    displayName: "Maxi",
    roleCodes: ["business_manager"],
    roleNames: ["Gerencia"],
    permissionCodes: [
      "checkout.sale.create",
      "cash.session.open",
      "cash.session.open.backdate",
      "cash.session.close",
      "cash.session.close.override_discrepancy",
      "cash.movement.manual.record",
      "sales_history.view",
      "sales_history.view_all_registers",
      "receivables.view",
      "receivables.payment.register",
      "receivables.notes.view",
      "products.view",
      "products.create_from_sourcing",
      "products.update_price",
      "inventory.adjust_stock",
      "inventory.bulk_import",
      "inventory.cost.view",
      "inventory.value.view",
      "reporting.executive.view",
      "reporting.margin.view",
      "reporting.credit_exposure.view",
      "sync.view",
    ],
    assignedRegisterIds: ["front-counter"],
  }),
  createFallbackActor({
    id: "user_exec_ana",
    displayName: "Ana",
    roleCodes: ["executive_readonly"],
    roleNames: ["Dirección"],
    permissionCodes: [
      "sales_history.view",
      "sales_history.view_all_registers",
      "receivables.view",
      "reporting.executive.view",
      "reporting.margin.view",
      "reporting.credit_exposure.view",
      "inventory.value.view",
    ],
  }),
  createFallbackActor({
    id: "user_admin_soporte",
    displayName: "Soporte",
    roleCodes: ["system_admin"],
    roleNames: ["System admin"],
    permissionCodes: [
      "users.manage",
      "roles.assign",
      "roles.manage",
      "audit.view",
      "system.support.override",
      "sync.view",
    ],
  }),
];

const defaultPriorityByRole: readonly string[] = [
  "business_manager",
  "shift_supervisor",
  "cashier",
  "executive_readonly",
  "system_admin",
];

export function findFallbackActorById(
  actorId: string,
): ActorAccessRecord | null {
  return fallbackActorAccessRecords.find((record) => record.user.getId() === actorId) ?? null;
}

export function findFallbackDefaultActor(): ActorAccessRecord {
  for (const roleCode of defaultPriorityByRole) {
    const actor = fallbackActorAccessRecords.find((record) =>
      record.roleCodes.includes(roleCode),
    );

    if (actor) {
      return actor;
    }
  }

  return fallbackActorAccessRecords[0]!;
}
