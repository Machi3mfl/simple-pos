import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { parseDateQueryParam } from "@/lib/date/parseDateQueryParam";
import { createReportingRuntime } from "@/modules/reporting/infrastructure/runtime/reportingRuntime";
import { profitSummaryResponseDTOSchema } from "@/modules/reporting/presentation/dtos/profit-summary-response.dto";

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

export async function GET(request: Request): Promise<Response> {
  noStore();
  const { getProfitSummaryReportUseCase } = createReportingRuntime();
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

  const summary = await getProfitSummaryReportUseCase.execute({
    periodStart: periodStart ?? undefined,
    periodEnd: periodEnd ?? undefined,
  });

  const parsedResponse = profitSummaryResponseDTOSchema.safeParse(summary);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta viola el contrato del resumen de ganancia.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
