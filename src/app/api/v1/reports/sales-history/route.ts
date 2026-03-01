import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { parseDateQueryParam } from "@/lib/date/parseDateQueryParam";
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

export async function GET(request: Request): Promise<Response> {
  noStore();
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
      message: "periodStart/periodEnd must be valid dates when provided.",
    });
  }

  if (periodStart && periodEnd && periodStart > periodEnd) {
    return errorResponse(400, {
      code: "validation_error",
      message: "periodStart must be earlier than or equal to periodEnd.",
    });
  }

  if (paymentMethod === "invalid") {
    return errorResponse(400, {
      code: "validation_error",
      message: "paymentMethod must be cash or on_account when provided.",
      details: [
        {
          field: "paymentMethod",
          message: "Expected cash | on_account.",
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
      message: "Response violates sales history report contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
