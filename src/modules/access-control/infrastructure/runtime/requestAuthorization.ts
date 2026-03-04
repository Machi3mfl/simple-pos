import { NextRequest, NextResponse } from "next/server";

import {
  isGuestAccessBypassEnabled,
  SUPPORT_OVERRIDE_PERMISSION,
} from "../../domain/constants/supportBridge";
import { buildEmptyPermissionSnapshot } from "../../domain/services/buildEmptyPermissionSnapshot";
import type { CurrentActorSnapshot } from "../../domain/types/PermissionSnapshot";
import { buildPermissionSnapshot } from "../../domain/services/buildPermissionSnapshot";
import {
  findFallbackActorById,
  findFallbackDefaultActor,
} from "../fallback/fallbackActors";
import { createAccessControlRuntime } from "./accessControlRuntime";
import { resolveRequestActor } from "./requestActorResolver";

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
}

export async function resolveActorSnapshotForRequest(
  request: NextRequest,
): Promise<CurrentActorSnapshot> {
  const requestActor = await resolveRequestActor(request);
  const { getCurrentActorSnapshotUseCase } = createAccessControlRuntime();

  const resolveCurrentActorSnapshot = async (
    params:
      | {
          readonly authUserId: string;
        }
      | {
          readonly actorId: string;
        },
  ) => {
    if ("authUserId" in params) {
      return getCurrentActorSnapshotUseCase.execute({
        authUserId: params.authUserId,
      });
    }

    return getCurrentActorSnapshotUseCase.execute({
      actorId: params.actorId,
    });
  };

  try {
    const controllerSnapshot = requestActor.authUserId
      ? await resolveCurrentActorSnapshot({
          authUserId: requestActor.authUserId,
        })
      : null;

    if (
      requestActor.actorId &&
      requestActor.supportActorId &&
      controllerSnapshot &&
      controllerSnapshot.actor.actorId === requestActor.supportActorId &&
      controllerSnapshot.permissionSnapshot.permissionCodes.includes(
        SUPPORT_OVERRIDE_PERMISSION,
      )
    ) {
      const assumedSnapshot = await resolveCurrentActorSnapshot({
        actorId: requestActor.actorId,
      });

      if (assumedSnapshot) {
        return {
          ...assumedSnapshot,
          session: {
            resolutionSource: "assumed_user",
            authUserId: requestActor.authUserId,
            canAssumeUserBridge: requestActor.canAssumeUserBridge,
            supportControllerActorId: requestActor.supportActorId,
          },
        };
      }
    }

    if (controllerSnapshot) {
      return {
        ...controllerSnapshot,
        session: {
          resolutionSource:
            requestActor.resolutionSource === "authenticated"
              ? "authenticated"
              : "authenticated_unmapped",
          authUserId: requestActor.authUserId,
          canAssumeUserBridge: requestActor.canAssumeUserBridge,
          supportControllerActorId: undefined,
        },
      };
    }

    if (requestActor.actorId) {
      const assumedSnapshot = await resolveCurrentActorSnapshot({
        actorId: requestActor.actorId,
      });
      if (assumedSnapshot) {
        return {
          ...assumedSnapshot,
          session: {
            resolutionSource: requestActor.resolutionSource,
            authUserId: requestActor.authUserId,
            canAssumeUserBridge: requestActor.canAssumeUserBridge,
            supportControllerActorId: requestActor.supportActorId,
          },
        };
      }
    }
  } catch {
    // Keep deterministic fallbacks only for explicit assumed-actor flows during
    // local demo/test bootstrap; unauthenticated request access must degrade to
    // zero permissions once real login becomes mandatory.
  }

  if (
    requestActor.resolutionSource === "authenticated" ||
    requestActor.resolutionSource === "authenticated_unmapped"
  ) {
    return {
      actor: {
        actorId: requestActor.authUserId ?? "authenticated-unmapped",
        displayName:
          requestActor.authenticatedDisplayName ?? "Usuario autenticado sin perfil",
        actorKind: "human",
        roleCodes: [],
        roleNames: [],
        assignedRegisterIds: [],
      },
      session: {
        resolutionSource:
          requestActor.resolutionSource === "authenticated"
            ? "authenticated_unmapped"
            : requestActor.resolutionSource,
        authUserId: requestActor.authUserId,
        canAssumeUserBridge: requestActor.canAssumeUserBridge,
        supportControllerActorId: requestActor.supportActorId,
      },
      permissionSnapshot: buildEmptyPermissionSnapshot(),
    };
  }

  if (requestActor.actorId) {
    const fallbackActor = findFallbackActorById(requestActor.actorId);
    if (fallbackActor) {
      return {
        actor: {
          actorId: fallbackActor.user.getId(),
          displayName: fallbackActor.user.getDisplayName(),
          actorKind: fallbackActor.user.getActorKind(),
          roleCodes: fallbackActor.roleCodes,
          roleNames: fallbackActor.roleNames,
          assignedRegisterIds: fallbackActor.assignedRegisterIds,
        },
        session: {
          resolutionSource: requestActor.resolutionSource,
          authUserId: requestActor.authUserId,
          canAssumeUserBridge: requestActor.canAssumeUserBridge,
          supportControllerActorId: requestActor.supportActorId,
        },
        permissionSnapshot: buildPermissionSnapshot(fallbackActor),
      };
    }
  }

  if (isGuestAccessBypassEnabled()) {
    const fallbackActor = findFallbackDefaultActor();

    return {
      actor: {
        actorId: fallbackActor.user.getId(),
        displayName: fallbackActor.user.getDisplayName(),
        actorKind: fallbackActor.user.getActorKind(),
        roleCodes: fallbackActor.roleCodes,
        roleNames: fallbackActor.roleNames,
        assignedRegisterIds: fallbackActor.assignedRegisterIds,
      },
      session: {
        resolutionSource: requestActor.resolutionSource,
        authUserId: requestActor.authUserId,
        canAssumeUserBridge: requestActor.canAssumeUserBridge,
        supportControllerActorId: requestActor.supportActorId,
      },
      permissionSnapshot: buildPermissionSnapshot(fallbackActor),
    };
  }

  return {
    actor: {
      actorId: "anonymous-session",
      displayName: "Sesión no autenticada",
      actorKind: "human",
      roleCodes: [],
      roleNames: [],
      assignedRegisterIds: [],
    },
    session: {
      resolutionSource: requestActor.resolutionSource,
      authUserId: requestActor.authUserId,
      canAssumeUserBridge: requestActor.canAssumeUserBridge,
      supportControllerActorId: requestActor.supportActorId,
    },
    permissionSnapshot: buildEmptyPermissionSnapshot(),
  };
}

export function actorHasAnyPermission(
  snapshot: CurrentActorSnapshot,
  permissionCodes: readonly string[],
): boolean {
  return permissionCodes.some((permissionCode) =>
    snapshot.permissionSnapshot.permissionCodes.includes(permissionCode),
  );
}

export function forbiddenPermissionResponse(
  message: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      code: "forbidden",
      message,
    },
    { status: 403 },
  );
}
