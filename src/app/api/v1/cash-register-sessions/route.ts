import { NextRequest, NextResponse } from "next/server";

import { resolveActorSnapshotForRequest } from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import {
  CashManagementDomainError,
  CashRegisterAssignmentError,
  CashRegisterInactiveError,
  CashRegisterNotFoundError,
  CashRegisterSessionAlreadyOpenError,
} from "@/modules/cash-management/domain/errors/CashManagementDomainError";
import { createCashManagementRuntime } from "@/modules/cash-management/infrastructure/runtime/cashManagementRuntime";
import { cashRegisterSessionResponseDTOSchema } from "@/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { openCashRegisterSessionDTOSchema } from "@/modules/cash-management/presentation/dtos/open-cash-register-session.dto";

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

export async function POST(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorSnapshot.permissionSnapshot.workspaces.cashRegister.canOpenSession) {
    return errorResponse(403, {
      code: "forbidden",
      message: "El operador actual no tiene permiso para abrir caja.",
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

  const parsedBody = openCashRegisterSessionDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validación de apertura de caja falló.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { openCashRegisterSessionUseCase } = createCashManagementRuntime();
    const session = await openCashRegisterSessionUseCase.execute({
      ...parsedBody.data,
      actorId: actorSnapshot.actor.actorId,
      accessibleRegisterIds: actorSnapshot.actor.assignedRegisterIds,
    });

    const parsedResponse = cashRegisterSessionResponseDTOSchema.safeParse(session);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de apertura de caja viola el contrato.",
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

    if (error instanceof CashRegisterSessionAlreadyOpenError) {
      return errorResponse(409, {
        code: "cash_session_already_open",
        message: error.message,
      });
    }

    if (error instanceof CashRegisterNotFoundError || error instanceof CashRegisterInactiveError) {
      return errorResponse(404, {
        code: "cash_register_not_found",
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
      message: "No se pudo abrir la caja.",
    });
  }
}
