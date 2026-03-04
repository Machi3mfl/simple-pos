export const SUPPORT_BRIDGE_ACTOR_ID = "user_admin_soporte";
export const SUPPORT_OVERRIDE_PERMISSION = "system.support.override";
const GUEST_ACCESS_BYPASS_ENV = "POS_ALLOW_GUEST_WORKSPACES";

export function isGuestAccessBypassEnabled(): boolean {
  return process.env[GUEST_ACCESS_BYPASS_ENV] === "1";
}
