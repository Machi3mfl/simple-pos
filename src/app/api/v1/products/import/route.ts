import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createCatalogRuntime } from "@/modules/catalog/infrastructure/runtime/catalogRuntime";
import {
  bulkCreateProductsDTOSchema,
  bulkCreateProductsResponseDTOSchema,
} from "@/modules/catalog/presentation/dtos/bulk-create-products.dto";

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

export async function POST(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["inventory.bulk_import"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para importar productos en lote.",
    );
  }

  const { bulkCreateProductsUseCase } = createCatalogRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
    });
  }

  const parsedBody = bulkCreateProductsDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validación del lote de productos falló.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const result = await bulkCreateProductsUseCase.execute(parsedBody.data);
  const parsedResponse = bulkCreateProductsResponseDTOSchema.safeParse(result);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta viola el contrato de carga masiva de productos.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
