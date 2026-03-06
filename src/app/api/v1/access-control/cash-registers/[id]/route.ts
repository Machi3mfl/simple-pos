import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createAccessControlRuntime } from "@/modules/access-control/infrastructure/runtime/accessControlRuntime";
import { accessControlCashRegisterDTOSchema } from "@/modules/access-control/presentation/dtos/access-control-workspace-response.dto";
import { upsertCashRegisterRequestDTOSchema } from "@/modules/access-control/presentation/dtos/upsert-cash-register.dto";

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
  if (!actorHasAnyPermission(actorSnapshot, ["users.manage"])) {
    return forbiddenPermissionResponse(
      "Tu perfil no tiene permisos para editar cajas.",
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

  const parsedBody = upsertCashRegisterRequestDTOSchema.safeParse(payload);
  if (!parsedBody.success || typeof parsedBody.data.isActive !== "boolean") {
    const details = parsedBody.success
      ? [{ field: "isActive", message: "El estado activo es obligatorio." }]
      : parsedBody.error.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        }));
    return errorResponse(400, {
      code: "validation_error",
      message: "La definición de caja es inválida.",
      details,
    });
  }

  try {
    const { updateCashRegisterUseCase } = createAccessControlRuntime();
    const register = await updateCashRegisterUseCase.execute({
      actorId: actorSnapshot.actor.actorId,
      registerId: params.id,
      name: parsedBody.data.name,
      locationCode: parsedBody.data.locationCode,
      isActive: parsedBody.data.isActive,
    });

    if (!register) {
      return errorResponse(404, {
        code: "cash_register_not_found",
        message: "No encontramos esa caja.",
      });
    }

    const parsedResponse = accessControlCashRegisterDTOSchema.safeParse(register);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de edición de caja viola el contrato.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: unknown) {
    return errorResponse(400, {
      code: "cash_register_update_failed",
      message:
        error instanceof Error ? error.message : "No se pudo editar la caja.",
    });
  }
}

