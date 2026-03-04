import { redirect } from "next/navigation";

import { getSupabaseServerComponentAuthClient } from "@/infrastructure/config/supabaseServer";

import { isGuestAccessBypassEnabled } from "../../domain/constants/supportBridge";

export async function requireAuthenticatedWorkspacePage(): Promise<void> {
  if (isGuestAccessBypassEnabled()) {
    return;
  }

  const authClient = getSupabaseServerComponentAuthClient();
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }
}
