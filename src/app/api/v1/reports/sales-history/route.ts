import { NextResponse } from "next/server";

import type { SalePaymentMethod } from "@/modules/sales/domain/entities/Sale";
import { reportingMockRuntime } from "@/modules/reporting/infrastructure/runtime/reportingMockRuntime";
import { salesHistoryResponseDTOSchema } from "@/modules/reporting/presentation/dtos/sales-history-response.dto";

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
  const url = new URL(request.url);
  const periodStart = parseDateQueryParam(url.searchParams.get("periodStart"));
  const periodEnd = parseDateQueryParam(url.searchParams.get("periodEnd"));
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

  const items = await reportingMockRuntime.getSalesHistoryReportUseCase.execute({
    periodStart: periodStart ?? undefined,
    periodEnd: periodEnd ?? undefined,
    paymentMethod: paymentMethod ?? undefined,
  });

  const parsedResponse = salesHistoryResponseDTOSchema.safeParse({ items });
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "mock_contract_error",
      message: "Mock response violates sales history report contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
