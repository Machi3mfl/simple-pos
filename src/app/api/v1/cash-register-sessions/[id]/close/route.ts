import { NextRequest, NextResponse } from "next/server";

import { resolveActorSnapshotForRequest } from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import {
  CashManagementDomainError,
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "@/modules/cash-management/domain/errors/CashManagementDomainError";
import { createCashManagementRuntime } from "@/modules/cash-management/infrastructure/runtime/cashManagementRuntime";
import { cashRegisterSessionResponseDTOSchema } from "@/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { closeCashRegisterSessionDTOSchema } from "@/modules/cash-management/presentation/dtos/close-cash-register-session.dto";

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
  if (!actorSnapshot.permissionSnapshot.workspaces.cashRegister.canCloseSession) {
    return errorResponse(403, {
      code: "forbidden",
      message: "El operador actual no tiene permiso para cerrar caja.",
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

  const parsedBody = closeCashRegisterSessionDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validación de cierre de caja falló.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { closeCashRegisterSessionUseCase } = createCashManagementRuntime();
    const session = await closeCashRegisterSessionUseCase.execute({
      sessionId: context.params.id,
      countedClosingAmount: parsedBody.data.countedClosingAmount,
      closingNotes: parsedBody.data.closingNotes,
      actorId: actorSnapshot.actor.actorId,
      accessibleRegisterIds: actorSnapshot.actor.assignedRegisterIds,
    });

    const parsedResponse = cashRegisterSessionResponseDTOSchema.safeParse(session);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de cierre de caja viola el contrato.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
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
        code: "cash_session_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "No se pudo cerrar la caja.",
    });
  }
}
