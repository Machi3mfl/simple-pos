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

export async function POST(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["users.manage"])) {
    return forbiddenPermissionResponse(
      "Tu perfil no tiene permisos para crear cajas.",
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
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La definición de caja es inválida.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { createCashRegisterUseCase } = createAccessControlRuntime();
    const register = await createCashRegisterUseCase.execute({
      actorId: actorSnapshot.actor.actorId,
      name: parsedBody.data.name,
      locationCode: parsedBody.data.locationCode,
    });

    const parsedResponse = accessControlCashRegisterDTOSchema.safeParse(register);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta del alta de caja viola el contrato.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 201 });
  } catch (error: unknown) {
    return errorResponse(400, {
      code: "cash_register_creation_failed",
      message:
        error instanceof Error ? error.message : "No se pudo crear la caja.",
    });
  }
}

