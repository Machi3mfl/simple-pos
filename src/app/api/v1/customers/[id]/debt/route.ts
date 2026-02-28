import { NextResponse } from "next/server";

import { getBackendMode } from "@/infrastructure/config/runtimeMode";
import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { parseDateQueryParam } from "@/lib/date/parseDateQueryParam";
import { GetCustomerDebtSummaryUseCase } from "@/modules/accounts-receivable/application/use-cases/GetCustomerDebtSummaryUseCase";
import { CustomerNotFoundForDebtError } from "@/modules/accounts-receivable/domain/errors/AccountsReceivableDomainError";
import type { DebtLedgerRepository } from "@/modules/accounts-receivable/domain/repositories/DebtLedgerRepository";
import { InMemoryDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/InMemoryDebtLedgerRepository";
import { SupabaseDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/SupabaseDebtLedgerRepository";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import { InMemoryCustomerRepository } from "@/modules/customers/infrastructure/repositories/InMemoryCustomerRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";
import { customerDebtSummaryResponseDTOSchema } from "@/modules/customers/presentation/dtos/customer-debt-summary-response.dto";

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
}

const customerRepository: CustomerRepository =
  getBackendMode() === "supabase"
    ? new SupabaseCustomerRepository(getSupabaseServerClient())
    : new InMemoryCustomerRepository();
const debtLedgerRepository: DebtLedgerRepository =
  getBackendMode() === "supabase"
    ? new SupabaseDebtLedgerRepository(getSupabaseServerClient())
    : new InMemoryDebtLedgerRepository();
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

export async function GET(
  request: Request,
  context: { params: { id: string } },
): Promise<Response> {
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
