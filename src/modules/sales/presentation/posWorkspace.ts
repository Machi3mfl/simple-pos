export type PosWorkspaceId =
  | "cash-register"
  | "sales"
  | "products"
  | "receivables"
  | "reporting"
  | "users-admin"
  | "sync";

export const posWorkspaceIds: readonly PosWorkspaceId[] = [
  "cash-register",
  "sales",
  "products",
  "receivables",
  "reporting",
  "users-admin",
  "sync",
];

export const workspacePathById: Record<PosWorkspaceId, string> = {
  "cash-register": "/cash-register",
  sales: "/sales",
  products: "/products",
  receivables: "/receivables",
  reporting: "/reporting",
  "users-admin": "/users-admin",
  sync: "/sync",
};

export function isPosWorkspaceId(value: string): value is PosWorkspaceId {
  return posWorkspaceIds.includes(value as PosWorkspaceId);
}
