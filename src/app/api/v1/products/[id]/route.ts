import { NextResponse } from "next/server";

import {
  ProductDomainError,
  ProductNotFoundError,
} from "@/modules/catalog/domain/errors/ProductDomainError";
import { createCatalogRuntime } from "@/modules/catalog/infrastructure/runtime/catalogRuntime";
import { productResponseDTOSchema } from "@/modules/catalog/presentation/dtos/product-response.dto";
import { updateProductDTOSchema } from "@/modules/catalog/presentation/dtos/update-product.dto";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[];
}

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

interface ProductRouteContext {
  readonly params: {
    readonly id: string;
  };
}

export async function PATCH(
  request: Request,
  { params }: ProductRouteContext,
): Promise<Response> {
  const { updateProductUseCase } = createCatalogRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
    });
  }

  const parsedBody = updateProductDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validación del payload de edición de producto falló.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const item = await updateProductUseCase.execute({
      productId: params.id,
      ...parsedBody.data,
    });
    const parsedResponse = productResponseDTOSchema.safeParse({ item });
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de producto.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ProductNotFoundError) {
      return errorResponse(404, {
        code: "product_not_found",
        message: error.message,
      });
    }

    if (error instanceof ProductDomainError) {
      return errorResponse(400, {
        code: "product_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrió un error inesperado al actualizar el producto.",
    });
  }
}
