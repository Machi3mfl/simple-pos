import { NextRequest, NextResponse } from "next/server";

import { resolveActorSnapshotForRequest } from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import {
  CashManagementDomainError,
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "@/modules/cash-management/domain/errors/CashManagementDomainError";
import { createCashManagementRuntime } from "@/modules/cash-management/infrastructure/runtime/cashManagementRuntime";
import { cashRegisterSessionDetailResponseDTOSchema } from "@/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { recordCashMovementDTOSchema } from "@/modules/cash-management/presentation/dtos/record-cash-movement.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[];
}

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } },
): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorSnapshot.permissionSnapshot.workspaces.cashRegister.canRecordManualCashMovement) {
    return errorResponse(403, {
      code: "forbidden",
      message: "El operador actual no tiene permiso para registrar movimientos manuales.",
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

  const parsedBody = recordCashMovementDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validación del movimiento de caja falló.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { recordCashMovementUseCase } = createCashManagementRuntime();
    const session = await recordCashMovementUseCase.execute({
      sessionId: context.params.id,
      movementType: parsedBody.data.movementType,
      amount: parsedBody.data.amount,
      direction: parsedBody.data.direction,
      notes: parsedBody.data.notes,
      actorId: actorSnapshot.actor.actorId,
      accessibleRegisterIds: actorSnapshot.actor.assignedRegisterIds,
    });

    const parsedResponse = cashRegisterSessionDetailResponseDTOSchema.safeParse(session);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta del movimiento de caja viola el contrato.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof CashRegisterAssignmentError) {
      return errorResponse(403, {
        code: "cash_register_unassigned",
        message: error.message,
      });
    }

    if (error instanceof CashRegisterSessionNotFoundError) {
      return errorResponse(404, {
        code: "cash_session_not_found",
        message: error.message,
      });
    }

    if (error instanceof CashManagementDomainError) {
      return errorResponse(400, {
        code: "cash_movement_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "No se pudo registrar el movimiento de caja.",
    });
  }
}
