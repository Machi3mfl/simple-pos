import { NextResponse } from "next/server";

import { createInventoryRuntime } from "@/modules/inventory/infrastructure/runtime/inventoryRuntime";
import {
  bulkStockMovementsDTOSchema,
  bulkStockMovementsResponseDTOSchema,
} from "@/modules/inventory/presentation/dtos/bulk-stock-movements.dto";

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
}

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  const { registerBulkStockMovementsUseCase } = createInventoryRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
    });
  }

  const parsedBody = bulkStockMovementsDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validación del lote de stock falló.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const result = await registerBulkStockMovementsUseCase.execute(parsedBody.data);
  const parsedResponse = bulkStockMovementsResponseDTOSchema.safeParse(result);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta viola el contrato de carga masiva de stock.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
