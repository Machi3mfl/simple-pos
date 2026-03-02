import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { ProductDomainError } from "@/modules/catalog/domain/errors/ProductDomainError";
import { createCatalogRuntime } from "@/modules/catalog/infrastructure/runtime/catalogRuntime";
import { CatalogProductImageInputError } from "@/modules/catalog/infrastructure/storage/SupabaseCatalogProductImageAssetStore";
import { parseCreateProductRequest } from "@/modules/catalog/presentation/handlers/parseProductMutationRequest";
import {
  productListResponseDTOSchema,
  productResponseDTOSchema,
} from "@/modules/catalog/presentation/dtos/product-response.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function parseActiveOnlyParam(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export async function GET(request: Request): Promise<Response> {
  noStore();
  const { listProductsUseCase } = createCatalogRuntime();
  const url = new URL(request.url);
  const categoryIdRaw = url.searchParams.get("categoryId");
  const activeOnlyRaw = url.searchParams.get("activeOnly");
  const activeOnly = parseActiveOnlyParam(activeOnlyRaw);

  if (activeOnlyRaw !== null && activeOnly === undefined) {
    return errorResponse(400, {
      code: "validation_error",
      message: "activeOnly debe ser true o false cuando se informa.",
      details: [
        {
          field: "activeOnly",
          message: "Se esperaba true o false.",
        },
      ],
    });
  }

  const categoryId = categoryIdRaw?.trim() || undefined;
  const items = await listProductsUseCase.execute({
    categoryId,
    activeOnly,
  });

  const responseBody = { items };
  const parsedResponse = productListResponseDTOSchema.safeParse(responseBody);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta viola el contrato de listado de productos.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const { createProductUseCase, persistProductImageUseCase } = createCatalogRuntime();
  const parsedBody = await parseCreateProductRequest(request);
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
            entityIdHint: parsedBody.data.sku ?? parsedBody.data.name,
            source: parsedBody.imageSource,
          })
        ).publicUrl
      : undefined;

    const item = await createProductUseCase.execute({
      ...parsedBody.data,
      imageUrl: managedImageUrl,
    });
    const responseBody = { item };
    const parsedResponse = productResponseDTOSchema.safeParse(responseBody);

    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de producto.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof CatalogProductImageInputError) {
      return errorResponse(400, {
        code: "image_validation_error",
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
      message: "Ocurrió un error inesperado al crear el producto.",
    });
  }
}
