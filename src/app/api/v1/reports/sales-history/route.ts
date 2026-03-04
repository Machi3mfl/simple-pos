import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { parseDateQueryParam } from "@/lib/date/parseDateQueryParam";
import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import type { SalePaymentMethod } from "@/modules/sales/domain/entities/Sale";
import { createReportingRuntime } from "@/modules/reporting/infrastructure/runtime/reportingRuntime";
import { salesHistoryResponseDTOSchema } from "@/modules/reporting/presentation/dtos/sales-history-response.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: ApiErrorDetail[];
}

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

function parsePaymentMethodQueryParam(
  value: string | null,
): SalePaymentMethod | null | "invalid" {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  if (value === "cash" || value === "on_account") {
    return value;
  }

  return "invalid";
}

export async function GET(request: NextRequest): Promise<Response> {
  noStore();
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (
    !actorHasAnyPermission(actorSnapshot, [
      "sales_history.view",
      "sales_history.view_all_registers",
    ])
  ) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para consultar ventas.",
    );
  }

  const { getSalesHistoryReportUseCase } = createReportingRuntime();
  const url = new URL(request.url);
  const periodStart = parseDateQueryParam(
    url.searchParams.get("periodStart"),
    "start",
  );
  const periodEnd = parseDateQueryParam(url.searchParams.get("periodEnd"), "end");
  const paymentMethod = parsePaymentMethodQueryParam(
    url.searchParams.get("paymentMethod"),
  );

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

  if (paymentMethod === "invalid") {
    return errorResponse(400, {
      code: "validation_error",
      message: "paymentMethod debe ser cash u on_account cuando se informa.",
      details: [
        {
          field: "paymentMethod",
          message: "Se esperaba cash | on_account.",
        },
      ],
    });
  }

  const items = await getSalesHistoryReportUseCase.execute({
    periodStart: periodStart ?? undefined,
    periodEnd: periodEnd ?? undefined,
    paymentMethod: paymentMethod ?? undefined,
  });

  const parsedResponse = salesHistoryResponseDTOSchema.safeParse({ items });
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta viola el contrato del historial de ventas.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
