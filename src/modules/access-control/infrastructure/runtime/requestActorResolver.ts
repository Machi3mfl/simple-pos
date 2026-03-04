import type { NextRequest } from "next/server";

import { getActorSessionCookieName, parseActorSessionCookie } from "../session/actorSessionCookie";

export interface RequestActorResolverResult {
  readonly actorId?: string;
  readonly authUserId?: string;
}

export function resolveRequestActor(
  request: NextRequest,
): RequestActorResolverResult {
  const actorCookie = parseActorSessionCookie(
    request.cookies.get(getActorSessionCookieName())?.value,
  );

  return {
    actorId: actorCookie?.userId,
  };
}
