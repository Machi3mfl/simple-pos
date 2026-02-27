import { NextResponse } from "next/server";

import { createStockMovementDTOSchema } from "@/modules/inventory/presentation/dtos/create-stock-movement.dto";
import { stockMovementResponseDTOSchema } from "@/modules/inventory/presentation/dtos/stock-movement-response.dto";

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

  const parsedRequest = createStockMovementDTOSchema.safeParse(payload);
  if (!parsedRequest.success) {
    const details = parsedRequest.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return errorResponse(400, {
      code: "validation_error",
      message: "Stock movement payload validation failed.",
      details,
    });
  }

  const { productId, movementType, quantity } = parsedRequest.data;
  const unitCost =
    movementType === "inbound" ? parsedRequest.data.unitCost : undefined;

  const responseBody = {
    movementId: `mov-${movementType}-${productId}`,
    productId,
    movementType,
    quantity,
    unitCost,
    occurredAt: "2026-02-27T00:00:00.000Z",
  };

  const parsedResponse = stockMovementResponseDTOSchema.safeParse(responseBody);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "mock_contract_error",
      message: "Mock response violates stock movement contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 201 });
}
