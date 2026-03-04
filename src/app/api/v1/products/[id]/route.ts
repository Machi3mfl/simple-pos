import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import {
  ProductDomainError,
  ProductNotFoundError,
} from "@/modules/catalog/domain/errors/ProductDomainError";
import { createCatalogRuntime } from "@/modules/catalog/infrastructure/runtime/catalogRuntime";
import { CatalogProductImageInputError } from "@/modules/catalog/infrastructure/storage/SupabaseCatalogProductImageAssetStore";
import { productResponseDTOSchema } from "@/modules/catalog/presentation/dtos/product-response.dto";
import { parseUpdateProductRequest } from "@/modules/catalog/presentation/handlers/parseProductMutationRequest";

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
  request: NextRequest,
  { params }: ProductRouteContext,
): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (
    !actorHasAnyPermission(actorSnapshot, [
      "products.update_price",
      "inventory.adjust_stock",
      "products.create_from_sourcing",
    ])
  ) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para actualizar productos.",
    );
  }

  const { updateProductUseCase, persistProductImageUseCase } = createCatalogRuntime();
  const parsedBody = await parseUpdateProductRequest(request);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: parsedBody.code,
      message: parsedBody.message,
      details: parsedBody.details,
    });
  }

  try {
    const managedImageUrl = parsedBody.imageSource
      ? (
          await persistProductImageUseCase.execute({
            entityIdHint: params.id,
            source: parsedBody.imageSource,
          })
        ).publicUrl
      : parsedBody.data.imageUrl;

    const item = await updateProductUseCase.execute({
      productId: params.id,
      ...parsedBody.data,
      imageUrl: managedImageUrl,
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
    if (error instanceof CatalogProductImageInputError) {
      return errorResponse(400, {
        code: "image_validation_error",
        message: error.message,
      });
    }

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
