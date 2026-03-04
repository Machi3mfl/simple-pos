import { NextRequest, NextResponse } from "next/server";

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
  const requestActor = resolveRequestActor(request);

  try {
    const { getCurrentActorSnapshotUseCase } = createAccessControlRuntime();
    const snapshot = await getCurrentActorSnapshotUseCase.execute(requestActor);
    if (snapshot) {
      return snapshot;
    }
  } catch {
    // The pre-auth bridge must stay demoable in non-Supabase runs, so route
    // guards fall back to deterministic in-memory actors when persistence is unavailable.
  }

  const fallbackActor =
    (requestActor.actorId ? findFallbackActorById(requestActor.actorId) : null) ??
    findFallbackDefaultActor();

  return {
    actor: {
      actorId: fallbackActor.user.getId(),
      displayName: fallbackActor.user.getDisplayName(),
      actorKind: fallbackActor.user.getActorKind(),
      roleCodes: fallbackActor.roleCodes,
      roleNames: fallbackActor.roleNames,
      assignedRegisterIds: fallbackActor.assignedRegisterIds,
    },
    permissionSnapshot: buildPermissionSnapshot(fallbackActor),
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
