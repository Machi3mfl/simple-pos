import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { InventoryDomainError } from "@/modules/inventory/domain/errors/InventoryDomainError";
import { createInventoryRuntime } from "@/modules/inventory/infrastructure/runtime/inventoryRuntime";
import { createStockMovementDTOSchema } from "@/modules/inventory/presentation/dtos/create-stock-movement.dto";
import { listStockMovementsResponseDTOSchema } from "@/modules/inventory/presentation/dtos/list-stock-movements-response.dto";
import { stockMovementResponseDTOSchema } from "@/modules/inventory/presentation/dtos/stock-movement-response.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  return date;
}

export async function GET(request: Request): Promise<Response> {
  noStore();
  const { listStockMovementsUseCase } = createInventoryRuntime();
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId")?.trim() || undefined;
  const movementTypeRaw = url.searchParams.get("movementType");
  const dateFrom = parseDateQueryParam(url.searchParams.get("dateFrom"));
  const dateTo = parseDateQueryParam(url.searchParams.get("dateTo"));

  if (
    movementTypeRaw &&
    !["inbound", "outbound", "adjustment"].includes(movementTypeRaw)
  ) {
    return errorResponse(400, {
      code: "validation_error",
      message: "movementType must be inbound, outbound, or adjustment.",
      details: [
        {
          field: "movementType",
          message: "Expected inbound | outbound | adjustment.",
        },
      ],
    });
  }

  if (dateFrom === "invalid" || dateTo === "invalid") {
    return errorResponse(400, {
      code: "validation_error",
      message: "dateFrom/dateTo must be valid dates when provided.",
    });
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return errorResponse(400, {
      code: "validation_error",
      message: "dateFrom must be earlier than or equal to dateTo.",
    });
  }

  const items = await listStockMovementsUseCase.execute({
    productId,
    movementType: movementTypeRaw as "inbound" | "outbound" | "adjustment" | undefined,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
  });

  const parsedResponse = listStockMovementsResponseDTOSchema.safeParse({ items });
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "Response violates stock movement history contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const { registerStockMovementUseCase } = createInventoryRuntime();
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

  try {
    const result = await registerStockMovementUseCase.execute(parsedRequest.data);
    const parsedResponse = stockMovementResponseDTOSchema.safeParse(result);

    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "Response violates stock movement contract.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof InventoryDomainError) {
      return errorResponse(400, {
        code: "stock_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Unexpected error while registering stock movement.",
    });
  }
}
