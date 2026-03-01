export type PosWorkspaceId =
  | "sales"
  | "orders"
  | "products"
  | "receivables"
  | "reporting"
  | "sync";

export const posWorkspaceIds: readonly PosWorkspaceId[] = [
  "sales",
  "orders",
  "products",
  "receivables",
  "reporting",
  "sync",
];

export const workspacePathById: Record<PosWorkspaceId, string> = {
  sales: "/sales",
  orders: "/orders",
  products: "/products",
  receivables: "/receivables",
  reporting: "/reporting",
  sync: "/sync",
};

export function isPosWorkspaceId(value: string): value is PosWorkspaceId {
  return posWorkspaceIds.includes(value as PosWorkspaceId);
}
