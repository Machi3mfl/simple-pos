import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { ProductDomainError } from "@/modules/catalog/domain/errors/ProductDomainError";
import { createCatalogRuntime } from "@/modules/catalog/infrastructure/runtime/catalogRuntime";
import { createProductDTOSchema } from "@/modules/catalog/presentation/dtos/create-product.dto";
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
  readonly details?: ApiErrorDetail[];
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
      message: "activeOnly must be true or false when provided.",
      details: [
        {
          field: "activeOnly",
          message: "Expected true or false.",
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
      message: "Response violates product list contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const { createProductUseCase } = createCatalogRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    });
  }

  const parsedBody = createProductDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    const details = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return errorResponse(400, {
      code: "validation_error",
      message: "Create product payload validation failed.",
      details,
    });
  }

  try {
    const item = await createProductUseCase.execute(parsedBody.data);
    const responseBody = { item };
    const parsedResponse = productResponseDTOSchema.safeParse(responseBody);

    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "Response violates product response contract.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ProductDomainError) {
      return errorResponse(400, {
        code: "product_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Unexpected error while creating product.",
    });
  }
}
