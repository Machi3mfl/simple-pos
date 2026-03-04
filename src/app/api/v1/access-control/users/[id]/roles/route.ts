import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createAccessControlRuntime } from "@/modules/access-control/infrastructure/runtime/accessControlRuntime";
import { replaceUserRolesRequestDTOSchema } from "@/modules/access-control/presentation/dtos/replace-user-roles.dto";

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

export async function PUT(
  request: NextRequest,
  { params }: { readonly params: { readonly id: string } },
): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (
    !actorHasAnyPermission(actorSnapshot, ["users.manage", "roles.assign"])
  ) {
    return forbiddenPermissionResponse(
      "Tu perfil no tiene permisos para reasignar roles de usuarios.",
    );
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

  const parsedBody = replaceUserRolesRequestDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La asignación de roles es inválida.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { replaceUserRolesUseCase } = createAccessControlRuntime();
    await replaceUserRolesUseCase.execute({
      actorId: actorSnapshot.actor.actorId,
      userId: params.id,
      roleIds: parsedBody.data.roleIds,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return errorResponse(400, {
      code: "user_role_assignment_failed",
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar los roles del usuario.",
    });
  }
}
