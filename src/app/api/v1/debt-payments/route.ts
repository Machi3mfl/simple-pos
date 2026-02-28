import { NextResponse } from "next/server";

import { getBackendMode } from "@/infrastructure/config/runtimeMode";
import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import {
  CustomerNotFoundForDebtError,
  DebtPaymentExceedsOutstandingError,
  AccountsReceivableDomainError,
} from "@/modules/accounts-receivable/domain/errors/AccountsReceivableDomainError";
import type { DebtLedgerRepository } from "@/modules/accounts-receivable/domain/repositories/DebtLedgerRepository";
import { InMemoryDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/InMemoryDebtLedgerRepository";
import { SupabaseDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/SupabaseDebtLedgerRepository";
import { createDebtPaymentDTOSchema } from "@/modules/accounts-receivable/presentation/dtos/create-debt-payment.dto";
import { debtPaymentResponseDTOSchema } from "@/modules/accounts-receivable/presentation/dtos/debt-payment-response.dto";
import { RegisterDebtPaymentUseCase } from "@/modules/accounts-receivable/application/use-cases/RegisterDebtPaymentUseCase";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import { InMemoryCustomerRepository } from "@/modules/customers/infrastructure/repositories/InMemoryCustomerRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: ApiErrorDetail[];
}

const customerRepository: CustomerRepository =
  getBackendMode() === "supabase"
    ? new SupabaseCustomerRepository(getSupabaseServerClient())
    : new InMemoryCustomerRepository();
const debtLedgerRepository: DebtLedgerRepository =
  getBackendMode() === "supabase"
    ? new SupabaseDebtLedgerRepository(getSupabaseServerClient())
    : new InMemoryDebtLedgerRepository();
const registerDebtPaymentUseCase = new RegisterDebtPaymentUseCase(
  debtLedgerRepository,
  customerRepository,
);

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    });
  }

  const parsedBody = createDebtPaymentDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    const details = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return errorResponse(400, {
      code: "validation_error",
      message: "Debt payment payload validation failed.",
      details,
    });
  }

  try {
    const result = await registerDebtPaymentUseCase.execute(parsedBody.data);
    const parsedResponse = debtPaymentResponseDTOSchema.safeParse(result);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "mock_contract_error",
        message: "Mock response violates debt payment contract.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof CustomerNotFoundForDebtError) {
      return errorResponse(404, {
        code: "customer_not_found",
        message: error.message,
      });
    }

    if (error instanceof DebtPaymentExceedsOutstandingError) {
      return errorResponse(409, {
        code: "debt_payment_conflict",
        message: error.message,
      });
    }

    if (error instanceof AccountsReceivableDomainError) {
      return errorResponse(400, {
        code: "debt_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Unexpected error while registering debt payment.",
    });
  }
}
