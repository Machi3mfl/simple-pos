import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getBackendMode } from "@/infrastructure/config/runtimeMode";
import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import { OnAccountDebtRecorderAdapter } from "@/modules/accounts-receivable/application/services/OnAccountDebtRecorderAdapter";
import { RecordOnAccountDebtUseCase } from "@/modules/accounts-receivable/application/use-cases/RecordOnAccountDebtUseCase";
import { InMemoryDebtLedgerRepository } from "@/modules/accounts-receivable/infrastructure/repositories/InMemoryDebtLedgerRepository";
import { FindOrCreateCustomerUseCase } from "@/modules/customers/application/use-cases/FindOrCreateCustomerUseCase";
import { InMemoryCustomerRepository } from "@/modules/customers/infrastructure/repositories/InMemoryCustomerRepository";
import { CreateSaleUseCase } from "@/modules/sales/application/use-cases/CreateSaleUseCase";
import { SaleDomainError } from "@/modules/sales/domain/errors/SaleDomainError";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";
import { InMemorySaleRepository } from "@/modules/sales/infrastructure/repositories/InMemorySaleRepository";
import { SupabaseSaleRepository } from "@/modules/sales/infrastructure/repositories/SupabaseSaleRepository";
import { createSaleDTOSchema } from "@/modules/sales/presentation/dtos/create-sale.dto";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: ApiErrorDetail[];
}

const customerRepository = new InMemoryCustomerRepository();
const saleRepository: SaleRepository =
  getBackendMode() === "supabase"
    ? new SupabaseSaleRepository(getSupabaseServerClient())
    : new InMemorySaleRepository();
const debtLedgerRepository = new InMemoryDebtLedgerRepository();
const findOrCreateCustomerUseCase = new FindOrCreateCustomerUseCase(customerRepository);
const recordOnAccountDebtUseCase = new RecordOnAccountDebtUseCase(debtLedgerRepository);
const onAccountDebtRecorder = new OnAccountDebtRecorderAdapter(
  recordOnAccountDebtUseCase,
);
const createSaleUseCase = new CreateSaleUseCase(
  saleRepository,
  findOrCreateCustomerUseCase,
  onAccountDebtRecorder,
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

  const parsedBody = createSaleDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    const details = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return errorResponse(400, {
      code: "validation_error",
      message: "Sale payload validation failed.",
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
        message: "Invalid request payload.",
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
      message: "Unexpected error while creating sale.",
    });
  }
}
