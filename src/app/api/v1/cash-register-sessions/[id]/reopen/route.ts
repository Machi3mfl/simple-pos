import { NextRequest, NextResponse } from "next/server";

import { resolveActorSnapshotForRequest } from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import {
  CashManagementDomainError,
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "@/modules/cash-management/domain/errors/CashManagementDomainError";
import { createCashManagementRuntime } from "@/modules/cash-management/infrastructure/runtime/cashManagementRuntime";
import { cashRegisterSessionDetailResponseDTOSchema } from "@/modules/cash-management/presentation/dtos/cash-register-session-response.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
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
        "El operador actual no tiene permiso para devolver el cierre a reconteo.",
    });
  }

  try {
    const { reopenCashRegisterSessionForRecountUseCase } =
      createCashManagementRuntime();
    const session = await reopenCashRegisterSessionForRecountUseCase.execute({
      sessionId: context.params.id,
      accessibleRegisterIds: actorSnapshot.actor.assignedRegisterIds,
    });

    const parsedResponse =
      cashRegisterSessionDetailResponseDTOSchema.safeParse(session);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de reapertura de caja viola el contrato.",
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
      message: "No se pudo reabrir la caja para reconteo.",
    });
  }
}
