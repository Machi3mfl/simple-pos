import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { parseDateQueryParam } from "@/lib/date/parseDateQueryParam";
import { GetCustomerDebtSummaryUseCase } from "@/modules/accounts-receivable/application/use-cases/GetCustomerDebtSummaryUseCase";
import { CustomerNotFoundForDebtError } from "@/modules/accounts-receivable/domain/errors/AccountsReceivableDomainError";
import type { DebtLedgerRepository } from "@/modules/accounts-receivable/domain/repositories/DebtLedgerRepository";
import { SupabaseDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/SupabaseDebtLedgerRepository";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";
import { customerDebtSummaryResponseDTOSchema } from "@/modules/customers/presentation/dtos/customer-debt-summary-response.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
}

function createCustomerDebtRuntime(): {
  getCustomerDebtSummaryUseCase: GetCustomerDebtSummaryUseCase;
} {
  const supabaseClient = getSupabaseServerClient();
  const customerRepository: CustomerRepository = new SupabaseCustomerRepository(
    supabaseClient,
  );
  const debtLedgerRepository: DebtLedgerRepository = new SupabaseDebtLedgerRepository(
    supabaseClient,
  );

  return {
    getCustomerDebtSummaryUseCase: new GetCustomerDebtSummaryUseCase(
      debtLedgerRepository,
      customerRepository,
    ),
  };
}

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
  noStore();
  const { getCustomerDebtSummaryUseCase } = createCustomerDebtRuntime();
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
        code: "response_contract_error",
        message: "Response violates customer debt summary contract.",
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
