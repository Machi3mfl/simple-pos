import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { parseDateQueryParam } from "@/lib/date/parseDateQueryParam";
import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { CustomerNotFoundForDebtError } from "@/modules/accounts-receivable/domain/errors/AccountsReceivableDomainError";
import { createAccountsReceivableRuntime } from "@/modules/accounts-receivable/infrastructure/runtime/accountsReceivableRuntime";
import { customerDebtSummaryResponseDTOSchema } from "@/modules/customers/presentation/dtos/customer-debt-summary-response.dto";

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

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
): Promise<Response> {
  noStore();
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["receivables.view"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para consultar el detalle de deuda.",
    );
  }

  const { getCustomerDebtSummaryUseCase } = createAccountsReceivableRuntime();
  const customerId = context.params.id;
  const url = new URL(request.url);
  const periodStart = parseDateQueryParam(
    url.searchParams.get("periodStart"),
    "start",
  );
  const periodEnd = parseDateQueryParam(url.searchParams.get("periodEnd"), "end");

  if (periodStart === "invalid" || periodEnd === "invalid") {
    return errorResponse(400, {
      code: "validation_error",
      message: "periodStart/periodEnd deben ser fechas válidas cuando se informan.",
    });
  }

  if (periodStart && periodEnd && periodStart > periodEnd) {
    return errorResponse(400, {
      code: "validation_error",
      message: "periodStart debe ser menor o igual a periodEnd.",
    });
  }

  try {
    const result = await getCustomerDebtSummaryUseCase.execute({
      customerId,
      periodStart: periodStart ?? undefined,
      periodEnd: periodEnd ?? undefined,
    });
    const responseBody = actorHasAnyPermission(actorSnapshot, ["receivables.notes.view"])
      ? result
      : {
          ...result,
          ledger: result.ledger.map((entry) => ({
            ...entry,
            notes: undefined,
          })),
        };

    const parsedResponse = customerDebtSummaryResponseDTOSchema.safeParse(responseBody);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato del resumen de deuda.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CustomerNotFoundForDebtError) {
      return errorResponse(404, {
        code: "customer_not_found",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrió un error inesperado al obtener el resumen de deuda.",
    });
  }
}
