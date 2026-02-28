import { NextResponse } from "next/server";

import { reportingMockRuntime } from "@/modules/reporting/infrastructure/runtime/reportingMockRuntime";
import { profitSummaryResponseDTOSchema } from "@/modules/reporting/presentation/dtos/profit-summary-response.dto";

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

function parseDateQueryParam(value: string | null): Date | null | "invalid" {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  return parsed;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const periodStart = parseDateQueryParam(url.searchParams.get("periodStart"));
  const periodEnd = parseDateQueryParam(url.searchParams.get("periodEnd"));

  if (periodStart === "invalid" || periodEnd === "invalid") {
    return errorResponse(400, {
      code: "validation_error",
      message: "periodStart/periodEnd must be valid dates when provided.",
    });
  }

  if (periodStart && periodEnd && periodStart > periodEnd) {
    return errorResponse(400, {
      code: "validation_error",
      message: "periodStart must be earlier than or equal to periodEnd.",
    });
  }

  const summary = await reportingMockRuntime.getProfitSummaryReportUseCase.execute({
    periodStart: periodStart ?? undefined,
    periodEnd: periodEnd ?? undefined,
  });

  const parsedResponse = profitSummaryResponseDTOSchema.safeParse(summary);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "mock_contract_error",
      message: "Mock response violates profit summary contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
