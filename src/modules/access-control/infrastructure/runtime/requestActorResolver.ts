import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";

import {
  getActorSessionCookieName,
  isAssumeUserBridgeEnabled,
  parseActorSessionCookie,
} from "../session/actorSessionCookie";

export interface RequestActorResolverResult {
  readonly actorId?: string;
  readonly authUserId?: string;
  readonly resolutionSource:
    | "authenticated"
    | "authenticated_unmapped"
    | "assumed_user"
    | "default_actor";
  readonly canAssumeUserBridge: boolean;
  readonly authenticatedDisplayName?: string;
}

function readBearerToken(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get("authorization")?.trim();
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim().length > 0 ? token.trim() : null;
}

function readSupabaseAccessTokenHeader(request: NextRequest): string | null {
  const token = request.headers.get("x-supabase-access-token")?.trim();
  return token && token.length > 0 ? token : null;
}

function resolveAuthenticatedDisplayName(user: User): string | undefined {
  const metadataDisplayName = user.user_metadata?.display_name;
  if (typeof metadataDisplayName === "string" && metadataDisplayName.trim().length > 0) {
    return metadataDisplayName.trim();
  }

  if (typeof user.email === "string" && user.email.trim().length > 0) {
    return user.email.trim();
  }

  return undefined;
}

async function resolveAuthenticatedActor(
  request: NextRequest,
): Promise<Pick<
  RequestActorResolverResult,
  "authUserId" | "authenticatedDisplayName" | "resolutionSource"
> | null> {
  const accessToken = readBearerToken(request) ?? readSupabaseAccessTokenHeader(request);
  if (!accessToken) {
    return null;
  }

  try {
    const { data, error } = await getSupabaseServerClient().auth.getUser(accessToken);
    if (error || !data.user) {
      return {
        resolutionSource: "authenticated_unmapped",
      };
    }

    return {
      authUserId: data.user.id,
      authenticatedDisplayName: resolveAuthenticatedDisplayName(data.user),
      resolutionSource: "authenticated",
    };
  } catch {
    return {
      resolutionSource: "authenticated_unmapped",
    };
  }
}

export async function resolveRequestActor(
  request: NextRequest,
): Promise<RequestActorResolverResult> {
  const canAssumeUserBridge = isAssumeUserBridgeEnabled();
  const authenticatedActor = await resolveAuthenticatedActor(request);
  if (authenticatedActor) {
    return {
      ...authenticatedActor,
      canAssumeUserBridge,
    };
  }

  const actorCookie = canAssumeUserBridge
    ? parseActorSessionCookie(
        request.cookies.get(getActorSessionCookieName())?.value,
      )
    : null;

  if (actorCookie?.userId) {
    return {
      actorId: actorCookie.userId,
      resolutionSource: "assumed_user",
      canAssumeUserBridge,
    };
  }

  return {
    resolutionSource: "default_actor",
    canAssumeUserBridge,
  };
}
