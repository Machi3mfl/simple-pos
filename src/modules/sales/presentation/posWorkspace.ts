export type PosWorkspaceId =
  | "sales"
  | "orders"
  | "catalog"
  | "inventory"
  | "receivables"
  | "reporting"
  | "sync";

export const posWorkspaceIds: readonly PosWorkspaceId[] = [
  "sales",
  "orders",
  "catalog",
  "inventory",
  "receivables",
  "reporting",
  "sync",
];

export const workspacePathById: Record<PosWorkspaceId, string> = {
  sales: "/sales",
  orders: "/orders",
  catalog: "/catalog",
  inventory: "/inventory",
  receivables: "/receivables",
  reporting: "/reporting",
  sync: "/sync",
};

export function isPosWorkspaceId(value: string): value is PosWorkspaceId {
  return posWorkspaceIds.includes(value as PosWorkspaceId);
}
