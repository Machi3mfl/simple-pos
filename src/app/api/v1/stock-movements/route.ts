import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { ProductNotFoundError } from "@/modules/catalog/domain/errors/ProductDomainError";
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

export async function GET(request: NextRequest): Promise<Response> {
  noStore();
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["products.view"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para consultar movimientos de stock.",
    );
  }

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
      message: "movementType debe ser inbound, outbound o adjustment.",
      details: [
        {
          field: "movementType",
          message: "Se esperaba inbound | outbound | adjustment.",
        },
      ],
    });
  }

  if (dateFrom === "invalid" || dateTo === "invalid") {
    return errorResponse(400, {
      code: "validation_error",
      message: "dateFrom/dateTo deben ser fechas válidas cuando se informan.",
    });
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return errorResponse(400, {
      code: "validation_error",
      message: "dateFrom debe ser menor o igual a dateTo.",
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
      message: "La respuesta viola el contrato del historial de stock.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}

export async function POST(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["inventory.adjust_stock"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para registrar movimientos de stock.",
    );
  }

  const { registerStockMovementUseCase } = createInventoryRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
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
      message: "La validación del payload de stock falló.",
      details,
    });
  }

  try {
    const result = await registerStockMovementUseCase.execute(parsedRequest.data);
    const parsedResponse = stockMovementResponseDTOSchema.safeParse(result);

    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de movimiento de stock.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ProductNotFoundError) {
      return errorResponse(404, {
        code: "product_not_found",
        message: error.message,
      });
    }

    if (error instanceof InventoryDomainError) {
      return errorResponse(400, {
        code: "stock_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrió un error inesperado al registrar el movimiento de stock.",
    });
  }
}
