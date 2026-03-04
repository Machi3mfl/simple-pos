import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import type { ApplyBulkPriceUpdateUseCaseInput } from "@/modules/catalog/application/use-cases/ApplyBulkPriceUpdateUseCase";
import {
  BulkPriceUpdateConflictError,
  ProductDomainError,
} from "@/modules/catalog/domain/errors/ProductDomainError";
import { createCatalogRuntime } from "@/modules/catalog/infrastructure/runtime/catalogRuntime";
import {
  bulkPriceUpdateDTOSchema,
  bulkPriceUpdateResponseDTOSchema,
} from "@/modules/catalog/presentation/dtos/bulk-price-update.dto";

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

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

function resolveScope(input: ReturnType<typeof bulkPriceUpdateDTOSchema.parse>): ApplyBulkPriceUpdateUseCaseInput["scope"] {
  if (input.scope.type === "all") {
    return { type: "all" };
  }

  if (input.scope.type === "category") {
    return {
      type: "category",
      categoryId: input.scope.categoryId ?? "",
    };
  }

  return {
    type: "selection",
    productIds: input.scope.productIds ?? [],
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["products.update_price"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para actualizar precios.",
    );
  }

  const { applyBulkPriceUpdateUseCase } = createCatalogRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
    });
  }

  const parsedBody = bulkPriceUpdateDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    const details = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return errorResponse(400, {
      code: "validation_error",
      message: "La validación del payload de actualización masiva falló.",
      details,
    });
  }

  const actorId = actorSnapshot.actor.actorId;

  try {
    const result = await applyBulkPriceUpdateUseCase.execute({
      scope: resolveScope(parsedBody.data),
      mode: parsedBody.data.mode,
      value: parsedBody.data.value,
      previewOnly: parsedBody.data.previewOnly,
      appliedBy: actorId,
    });

    const parsedResponse = bulkPriceUpdateResponseDTOSchema.safeParse(result);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de actualización masiva.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof BulkPriceUpdateConflictError) {
      return errorResponse(409, {
        code: "bulk_price_conflict",
        message: error.message,
        details: error.invalidItems.map((item) => ({
          field: item.productId,
          message: item.reason,
        })),
      });
    }

    if (error instanceof ProductDomainError) {
      return errorResponse(400, {
        code: "bulk_price_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrió un error inesperado al aplicar la actualización masiva.",
    });
  }
}
