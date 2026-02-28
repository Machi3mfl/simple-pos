import { NextResponse } from "next/server";

import { GetCustomerDebtSummaryUseCase } from "@/modules/accounts-receivable/application/use-cases/GetCustomerDebtSummaryUseCase";
import { CustomerNotFoundForDebtError } from "@/modules/accounts-receivable/domain/errors/AccountsReceivableDomainError";
import { InMemoryDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/InMemoryDebtLedgerRepository";
import { InMemoryCustomerRepository } from "@/modules/customers/infrastructure/repositories/InMemoryCustomerRepository";
import { customerDebtSummaryResponseDTOSchema } from "@/modules/customers/presentation/dtos/customer-debt-summary-response.dto";

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
}

const customerRepository = new InMemoryCustomerRepository();
const debtLedgerRepository = new InMemoryDebtLedgerRepository();
const getCustomerDebtSummaryUseCase = new GetCustomerDebtSummaryUseCase(
  debtLedgerRepository,
  customerRepository,
);

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

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  return date;
}

export async function GET(
  request: Request,
  context: { params: { id: string } },
): Promise<Response> {
  const customerId = context.params.id;
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

  try {
    const result = await getCustomerDebtSummaryUseCase.execute({
      customerId,
      periodStart: periodStart ?? undefined,
      periodEnd: periodEnd ?? undefined,
    });

    const parsedResponse = customerDebtSummaryResponseDTOSchema.safeParse(result);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "mock_contract_error",
        message: "Mock response violates customer debt summary contract.",
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
      message: "Unexpected error while retrieving debt summary.",
    });
  }
}
