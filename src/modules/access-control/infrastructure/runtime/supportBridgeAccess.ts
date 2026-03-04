import type { NextRequest } from "next/server";

import {
  isGuestAccessBypassEnabled,
  SUPPORT_BRIDGE_ACTOR_ID,
  SUPPORT_OVERRIDE_PERMISSION,
} from "../../domain/constants/supportBridge";
import { buildPermissionSnapshot } from "../../domain/services/buildPermissionSnapshot";
import { findFallbackActorById } from "../fallback/fallbackActors";
import { createAccessControlRuntime } from "./accessControlRuntime";
import { resolveRequestActor } from "./requestActorResolver";

interface ResolvedPermissionSnapshot {
  readonly actorId: string;
  readonly permissionCodes: readonly string[];
}

export interface SupportBridgeAccessSnapshot {
  readonly bridgeEnabled: boolean;
  readonly canManageBridge: boolean;
  readonly canBootstrapSupportActor: boolean;
  readonly supportControllerActorId?: string;
}

async function resolvePermissionSnapshot(input: {
  readonly actorId?: string;
  readonly authUserId?: string;
}): Promise<ResolvedPermissionSnapshot | null> {
  try {
    const { getCurrentActorSnapshotUseCase } = createAccessControlRuntime();
    const snapshot = await getCurrentActorSnapshotUseCase.execute(input);
    if (snapshot) {
      return {
        actorId: snapshot.actor.actorId,
        permissionCodes: snapshot.permissionSnapshot.permissionCodes,
      };
    }
  } catch {
    // Keep the support bridge demoable when Supabase is unavailable by falling back
    // to deterministic in-memory actors for known IDs.
  }

  if (!input.actorId) {
    return null;
  }

  const fallbackActor = findFallbackActorById(input.actorId);
  if (!fallbackActor) {
    return null;
  }

  const permissionSnapshot = buildPermissionSnapshot(fallbackActor);
  return {
    actorId: fallbackActor.user.getId(),
    permissionCodes: permissionSnapshot.permissionCodes,
  };
}

export async function resolveSupportBridgeAccess(
  request: NextRequest,
): Promise<SupportBridgeAccessSnapshot> {
  const requestActor = await resolveRequestActor(request);
  if (!requestActor.canAssumeUserBridge) {
    return {
      bridgeEnabled: false,
      canManageBridge: false,
      canBootstrapSupportActor: false,
      supportControllerActorId: undefined,
    };
  }

  const controllerSnapshot =
    requestActor.authUserId
      ? await resolvePermissionSnapshot({
          authUserId: requestActor.authUserId,
        })
      : requestActor.supportActorId
        ? await resolvePermissionSnapshot({ actorId: requestActor.supportActorId })
        : null;
  const canManageBridge =
    controllerSnapshot?.permissionCodes.includes(SUPPORT_OVERRIDE_PERMISSION) ?? false;
  const canBootstrapSupportActor =
    isGuestAccessBypassEnabled() && !requestActor.authUserId;

  return {
    bridgeEnabled: true,
    canManageBridge,
    canBootstrapSupportActor,
    supportControllerActorId: canManageBridge
      ? controllerSnapshot?.actorId
      : undefined,
  };
}

export async function isSupportBridgeBootstrapTarget(
  userId: string,
): Promise<boolean> {
  if (userId !== SUPPORT_BRIDGE_ACTOR_ID) {
    return false;
  }

  const permissionSnapshot = await resolvePermissionSnapshot({ actorId: userId });
  return permissionSnapshot?.permissionCodes.includes(SUPPORT_OVERRIDE_PERMISSION) ?? false;
}
