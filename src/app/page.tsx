import { redirect } from "next/navigation";

import { isAssumeUserBridgeEnabled } from "@/modules/access-control/infrastructure/session/actorSessionCookie";

export default function HomePage(): never {
  redirect(isAssumeUserBridgeEnabled() ? "/cash-register" : "/login");
}
