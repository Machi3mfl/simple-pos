import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { OnAccountDebtRecorderAdapter } from "@/modules/accounts-receivable/application/services/OnAccountDebtRecorderAdapter";
import { RecordOnAccountDebtUseCase } from "@/modules/accounts-receivable/application/use-cases/RecordOnAccountDebtUseCase";
import type { DebtLedgerRepository } from "@/modules/accounts-receivable/domain/repositories/DebtLedgerRepository";
import { SupabaseDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/SupabaseDebtLedgerRepository";
import { FindOrCreateCustomerUseCase } from "@/modules/customers/application/use-cases/FindOrCreateCustomerUseCase";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";
import { CreateSaleUseCase } from "@/modules/sales/application/use-cases/CreateSaleUseCase";
import { SaleDomainError } from "@/modules/sales/domain/errors/SaleDomainError";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";
import { SupabaseSaleRepository } from "@/modules/sales/infrastructure/repositories/SupabaseSaleRepository";
import { createSaleDTOSchema } from "@/modules/sales/presentation/dtos/create-sale.dto";

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

function createSaleRuntime(): {
  createSaleUseCase: CreateSaleUseCase;
} {
  const supabaseClient = getSupabaseServerClient();
  const customerRepository: CustomerRepository = new SupabaseCustomerRepository(
    supabaseClient,
  );
  const saleRepository: SaleRepository = new SupabaseSaleRepository(supabaseClient);
  const debtLedgerRepository: DebtLedgerRepository = new SupabaseDebtLedgerRepository(
    supabaseClient,
  );
  const findOrCreateCustomerUseCase = new FindOrCreateCustomerUseCase(customerRepository);
  const recordOnAccountDebtUseCase = new RecordOnAccountDebtUseCase(debtLedgerRepository);
  const onAccountDebtRecorder = new OnAccountDebtRecorderAdapter(
    recordOnAccountDebtUseCase,
  );

  return {
    createSaleUseCase: new CreateSaleUseCase(
      saleRepository,
      findOrCreateCustomerUseCase,
      onAccountDebtRecorder,
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
  const { createSaleUseCase } = createSaleRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
    });
  }

  const parsedBody = createSaleDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    const details = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return errorResponse(400, {
      code: "validation_error",
      message: "La validación del payload de venta falló.",
      details,
    });
  }

  try {
    const result = await createSaleUseCase.execute(parsedBody.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SaleDomainError) {
      return errorResponse(400, {
        code: "sale_rule_error",
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      return errorResponse(400, {
        code: "validation_error",
        message: "El payload enviado es inválido.",
      });
    }

    if (error instanceof Error) {
      return errorResponse(400, {
        code: "checkout_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrió un error inesperado al crear la venta.",
    });
  }
}
