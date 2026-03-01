import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import {
  CustomerNotFoundForDebtError,
  DebtOrderNotFoundError,
  DebtPaymentExceedsOrderOutstandingError,
  DebtPaymentExceedsOutstandingError,
  AccountsReceivableDomainError,
} from "@/modules/accounts-receivable/domain/errors/AccountsReceivableDomainError";
import type { DebtLedgerRepository } from "@/modules/accounts-receivable/domain/repositories/DebtLedgerRepository";
import { SupabaseDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/SupabaseDebtLedgerRepository";
import { createDebtPaymentDTOSchema } from "@/modules/accounts-receivable/presentation/dtos/create-debt-payment.dto";
import { debtPaymentResponseDTOSchema } from "@/modules/accounts-receivable/presentation/dtos/debt-payment-response.dto";
import { RegisterDebtPaymentUseCase } from "@/modules/accounts-receivable/application/use-cases/RegisterDebtPaymentUseCase";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";

export const dynamic = "force-dynamic";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: ApiErrorDetail[];
}

function createDebtPaymentsRuntime(): {
  registerDebtPaymentUseCase: RegisterDebtPaymentUseCase;
} {
  const supabaseClient = getSupabaseServerClient();
  const customerRepository: CustomerRepository = new SupabaseCustomerRepository(
    supabaseClient,
  );
  const debtLedgerRepository: DebtLedgerRepository = new SupabaseDebtLedgerRepository(
    supabaseClient,
  );

  return {
    registerDebtPaymentUseCase: new RegisterDebtPaymentUseCase(
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

export async function POST(request: Request): Promise<Response> {
  const { registerDebtPaymentUseCase } = createDebtPaymentsRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
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
      message: "La validación del payload de pago de deuda falló.",
      details,
    });
  }

  try {
    const result = await registerDebtPaymentUseCase.execute(parsedBody.data);
    const parsedResponse = debtPaymentResponseDTOSchema.safeParse(result);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de pago de deuda.",
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

    if (error instanceof DebtOrderNotFoundError) {
      return errorResponse(404, {
        code: "debt_order_not_found",
        message: error.message,
      });
    }

    if (
      error instanceof DebtPaymentExceedsOutstandingError ||
      error instanceof DebtPaymentExceedsOrderOutstandingError
    ) {
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
      message: "Ocurrió un error inesperado al registrar el pago de deuda.",
    });
  }
}
