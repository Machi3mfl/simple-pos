import type { PermissionSnapshot } from "../domain/types/PermissionSnapshot";
import type { PosWorkspaceId } from "@/modules/sales/presentation/posWorkspace";

const defaultWorkspacePriority: readonly PosWorkspaceId[] = [
  "cash-register",
  "sales",
  "receivables",
  "products",
  "reporting",
  "users-admin",
  "sync",
];

export function canAccessWorkspace(
  workspaceId: PosWorkspaceId,
  permissionSnapshot: PermissionSnapshot | null,
): boolean {
  if (!permissionSnapshot) {
    return false;
  }

  switch (workspaceId) {
    case "cash-register":
      return permissionSnapshot.workspaces.cashRegister.canView;
    case "sales":
      return permissionSnapshot.workspaces.sales.canView;
    case "products":
      return permissionSnapshot.workspaces.products.canView;
    case "receivables":
      return permissionSnapshot.workspaces.receivables.canView;
    case "reporting":
      return permissionSnapshot.workspaces.reporting.canView;
    case "sync":
      return permissionSnapshot.workspaces.sync.canView;
    case "users-admin":
      return permissionSnapshot.workspaces.usersAdmin.canView;
    default:
      return false;
  }
}

export function resolvePreferredWorkspaceId(
  permissionSnapshot: PermissionSnapshot | null,
): PosWorkspaceId | null {
  for (const workspaceId of defaultWorkspacePriority) {
    if (canAccessWorkspace(workspaceId, permissionSnapshot)) {
      return workspaceId;
    }
  }

  return null;
}
