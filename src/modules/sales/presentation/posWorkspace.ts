export type PosWorkspaceId =
  | "sales"
  | "catalog"
  | "inventory"
  | "receivables"
  | "reporting"
  | "sync";

export const posWorkspaceIds: readonly PosWorkspaceId[] = [
  "sales",
  "catalog",
  "inventory",
  "receivables",
  "reporting",
  "sync",
];

export const workspacePathById: Record<PosWorkspaceId, string> = {
  sales: "/pos/sales",
  catalog: "/pos/catalog",
  inventory: "/pos/inventory",
  receivables: "/pos/receivables",
  reporting: "/pos/reporting",
  sync: "/pos/sync",
};

export function isPosWorkspaceId(value: string): value is PosWorkspaceId {
  return posWorkspaceIds.includes(value as PosWorkspaceId);
}
