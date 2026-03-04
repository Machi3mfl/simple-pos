import { NextRequest, NextResponse } from "next/server";

import {
  findFallbackActorById,
} from "@/modules/access-control/infrastructure/fallback/fallbackActors";
import { createAccessControlRuntime } from "@/modules/access-control/infrastructure/runtime/accessControlRuntime";
import {
  getActorSessionCookieName,
  isAssumeUserBridgeEnabled,
  serializeActorSessionCookie,
  shouldUseSecureActorSessionCookie,
} from "@/modules/access-control/infrastructure/session/actorSessionCookie";
import {
  isSupportBridgeBootstrapTarget,
  resolveSupportBridgeAccess,
} from "@/modules/access-control/infrastructure/runtime/supportBridgeAccess";
import {
  assumeUserSessionRequestDTOSchema,
  assumeUserSessionResponseDTOSchema,
} from "@/modules/access-control/presentation/dtos/assume-user.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
}

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

function buildSuccessResponse(payload: {
  readonly actorId: string;
  readonly displayName: string;
  readonly roleCodes: readonly string[];
  readonly roleNames: readonly string[];
  readonly assignedRegisterIds: readonly string[];
  readonly supportControllerActorId?: string;
}, request?: NextRequest): NextResponse {
  const { supportControllerActorId, ...responseBody } = payload;
  const response = NextResponse.json(responseBody, { status: 200 });
  response.cookies.set({
    name: getActorSessionCookieName(),
    value: serializeActorSessionCookie({
      userId: payload.actorId,
      supportUserId: supportControllerActorId,
    }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: shouldUseSecureActorSessionCookie(request),
  });

  return response;
}

export async function POST(request: NextRequest): Promise<Response> {
  const bridgeAccess = await resolveSupportBridgeAccess(request);
  if (!bridgeAccess.bridgeEnabled) {
    return errorResponse(403, {
      code: "assume_user_bridge_disabled",
      message:
        "La selección temporal de operador está deshabilitada para esta instancia.",
    });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body debe ser JSON válido.",
    });
  }

  const parsedBody = assumeUserSessionRequestDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La selección de operador es inválida.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const canBootstrapSupportActor = await isSupportBridgeBootstrapTarget(
    parsedBody.data.userId,
  );
  const canSwitchActor =
    bridgeAccess.canManageBridge ||
    (bridgeAccess.canBootstrapSupportActor && canBootstrapSupportActor);

  if (!canSwitchActor) {
    return errorResponse(403, {
      code: "forbidden",
      message:
        "La selección temporal de operador quedó restringida al modo soporte.",
    });
  }

  try {
    const { assumeSelectableActorUseCase } = createAccessControlRuntime();
    const actor = await assumeSelectableActorUseCase.execute(parsedBody.data.userId);
    if (!actor) {
      return errorResponse(404, {
        code: "actor_not_found",
        message: "No encontramos ese operador activo.",
      });
    }

    const parsedResponse = assumeUserSessionResponseDTOSchema.safeParse(actor);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de selección de operador viola el contrato.",
      });
    }

    return buildSuccessResponse(
      {
        ...parsedResponse.data,
        supportControllerActorId:
          bridgeAccess.supportControllerActorId ??
          (canBootstrapSupportActor ? parsedResponse.data.actorId : undefined),
      },
      request,
    );
  } catch {
    const actor = findFallbackActorById(parsedBody.data.userId);
    if (!actor) {
      return errorResponse(404, {
        code: "actor_not_found",
        message: "No encontramos ese operador activo.",
      });
    }

    const responseBody = {
      actorId: actor.user.getId(),
      displayName: actor.user.getDisplayName(),
      roleCodes: actor.roleCodes,
      roleNames: actor.roleNames,
      assignedRegisterIds: actor.assignedRegisterIds,
    };
    const parsedResponse = assumeUserSessionResponseDTOSchema.safeParse(responseBody);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta fallback de selección de operador viola el contrato.",
      });
    }

    return buildSuccessResponse(
      {
        ...parsedResponse.data,
        supportControllerActorId:
          bridgeAccess.supportControllerActorId ??
          (canBootstrapSupportActor ? parsedResponse.data.actorId : undefined),
      },
      request,
    );
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  if (!isAssumeUserBridgeEnabled()) {
    return errorResponse(403, {
      code: "assume_user_bridge_disabled",
      message:
        "La selección temporal de operador está deshabilitada para esta instancia.",
    });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: getActorSessionCookieName(),
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureActorSessionCookie(request),
    maxAge: 0,
  });

  return response;
}
