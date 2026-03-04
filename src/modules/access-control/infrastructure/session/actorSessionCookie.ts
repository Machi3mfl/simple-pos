import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const ACTOR_SESSION_COOKIE_NAME = "actor_session";

interface ActorSessionCookiePayload {
  readonly userId: string;
  readonly supportUserId?: string;
}

function parseBooleanEnv(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function resolveCookieSecret(): string {
  return (
    process.env.ACTOR_SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "simple-pos-dev-actor-session-secret"
  );
}

function signValue(value: string): string {
  return createHmac("sha256", resolveCookieSecret()).update(value).digest("base64url");
}

export function getActorSessionCookieName(): string {
  return ACTOR_SESSION_COOKIE_NAME;
}

export function isAssumeUserBridgeEnabled(): boolean {
  const explicitValue = parseBooleanEnv(process.env.POS_ENABLE_ASSUME_USER_BRIDGE);
  if (explicitValue !== null) {
    return explicitValue;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const deploymentEnvironment = (
    process.env.VERCEL_ENV ??
    process.env.APP_ENV ??
    process.env.POS_RUNTIME_ENV ??
    ""
  )
    .trim()
    .toLowerCase();

  return deploymentEnvironment !== "production";
}

function isLocalHostname(hostname: string): boolean {
  const normalizedHostname = hostname.trim().toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1" ||
    normalizedHostname.endsWith(".local")
  );
}

export function shouldUseSecureActorSessionCookie(
  request?: NextRequest,
): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  if (!request) {
    return true;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim().toLowerCase();
  if (forwardedProto === "https") {
    return true;
  }

  const protocol = request.nextUrl.protocol.replace(":", "").trim().toLowerCase();
  if (protocol === "https") {
    return true;
  }

  const requestHostname = request.nextUrl.hostname;
  if (isLocalHostname(requestHostname)) {
    return false;
  }

  const hostHeader = request.headers.get("host");
  if (!hostHeader) {
    return true;
  }

  const hostName = hostHeader.split(":")[0] ?? hostHeader;
  return !isLocalHostname(hostName);
}

export function serializeActorSessionCookie(
  payload: ActorSessionCookiePayload,
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseActorSessionCookie(
  value: string | undefined,
): ActorSessionCookiePayload | null {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { userId?: unknown; supportUserId?: unknown };

    if (typeof parsed.userId !== "string" || parsed.userId.trim().length === 0) {
      return null;
    }

    return {
      userId: parsed.userId,
      supportUserId:
        typeof parsed.supportUserId === "string" &&
        parsed.supportUserId.trim().length > 0
          ? parsed.supportUserId
          : undefined,
    };
  } catch {
    return null;
  }
}
