export type BackendMode = "mock" | "supabase";

export function getBackendMode(): BackendMode {
  return process.env.POS_BACKEND_MODE === "supabase" ? "supabase" : "mock";
}

export function isSupabaseMode(): boolean {
  return getBackendMode() === "supabase";
}
