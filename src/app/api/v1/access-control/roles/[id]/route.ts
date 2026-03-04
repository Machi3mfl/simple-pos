import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createAccessControlRuntime } from "@/modules/access-control/infrastructure/runtime/accessControlRuntime";
import { accessControlRoleDTOSchema } from "@/modules/access-control/presentation/dtos/access-control-workspace-response.dto";
import { upsertRoleRequestDTOSchema } from "@/modules/access-control/presentation/dtos/upsert-role.dto";

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
  if (!actorHasAnyPermission(actorSnapshot, ["roles.manage"])) {
    return forbiddenPermissionResponse(
      "Tu perfil no tiene permisos para editar roles personalizados.",
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

  const parsedBody = upsertRoleRequestDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La definición del rol es inválida.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { updateCustomRoleUseCase } = createAccessControlRuntime();
    const role = await updateCustomRoleUseCase.execute({
      actorId: actorSnapshot.actor.actorId,
      roleId: params.id,
      name: parsedBody.data.name,
      description: parsedBody.data.description,
      permissionCodes: parsedBody.data.permissionCodes,
    });

    if (!role) {
      return errorResponse(404, {
        code: "role_not_found",
        message: "No encontramos ese rol.",
      });
    }

    const responseBody = {
      ...role,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
    const parsedResponse = accessControlRoleDTOSchema.safeParse(responseBody);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de edición de rol viola el contrato.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: unknown) {
    return errorResponse(400, {
      code: "role_update_failed",
      message:
        error instanceof Error ? error.message : "No se pudo actualizar el rol.",
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { readonly params: { readonly id: string } },
): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["roles.manage"])) {
    return forbiddenPermissionResponse(
      "Tu perfil no tiene permisos para eliminar roles personalizados.",
    );
  }

  try {
    const { deleteCustomRoleUseCase } = createAccessControlRuntime();
    const deleted = await deleteCustomRoleUseCase.execute({
      actorId: actorSnapshot.actor.actorId,
      roleId: params.id,
    });

    if (!deleted) {
      return errorResponse(404, {
        code: "role_not_found",
        message: "No encontramos ese rol.",
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return errorResponse(400, {
      code: "role_delete_failed",
      message:
        error instanceof Error ? error.message : "No se pudo eliminar el rol.",
    });
  }
}
