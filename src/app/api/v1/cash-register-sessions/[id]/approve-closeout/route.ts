import { NextRequest, NextResponse } from "next/server";

import { resolveActorSnapshotForRequest } from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import {
  CashManagementDomainError,
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "@/modules/cash-management/domain/errors/CashManagementDomainError";
import { createCashManagementRuntime } from "@/modules/cash-management/infrastructure/runtime/cashManagementRuntime";
import { cashRegisterSessionResponseDTOSchema } from "@/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { approveCashRegisterCloseoutDTOSchema } from "@/modules/cash-management/presentation/dtos/approve-cash-register-closeout.dto";

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
  if (
    !actorSnapshot.permissionSnapshot.workspaces.cashRegister
      .canApproveDiscrepancyClose
  ) {
    return errorResponse(403, {
      code: "forbidden",
      message:
        "El operador actual no tiene permiso para aprobar cierres con diferencia.",
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

  const parsedBody = approveCashRegisterCloseoutDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validación de aprobación de cierre falló.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { approveCashRegisterSessionCloseoutUseCase } =
      createCashManagementRuntime();
    const session = await approveCashRegisterSessionCloseoutUseCase.execute({
      sessionId: context.params.id,
      actorId: actorSnapshot.actor.actorId,
      approvalNotes: parsedBody.data.approvalNotes,
      accessibleRegisterIds: actorSnapshot.actor.assignedRegisterIds,
    });

    const parsedResponse = cashRegisterSessionResponseDTOSchema.safeParse(session);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de aprobación de cierre viola el contrato.",
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
      message: "No se pudo aprobar el cierre de caja.",
    });
  }
}
