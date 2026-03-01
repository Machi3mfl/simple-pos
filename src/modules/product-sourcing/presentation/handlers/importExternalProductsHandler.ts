import { NextResponse } from "next/server";

import { ProductSourcingDomainError } from "../../domain/errors/ProductSourcingDomainError";
import type { ImportExternalProductsUseCase } from "../../application/use-cases/ImportExternalProductsUseCase";
import {
  importExternalProductsDTOSchema,
  importExternalProductsResponseDTOSchema,
} from "../dtos/import-external-products.dto";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[];
}

function errorResponse(status: number, body: ApiErrorResponse): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function handleImportExternalProductsRequest(
  request: Request,
  importExternalProductsUseCase: ImportExternalProductsUseCase,
): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body de la request debe ser JSON valido.",
    });
  }

  const parsedBody = importExternalProductsDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La validacion del lote de importacion externa fallo.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const result = await importExternalProductsUseCase.execute({
      items: parsedBody.data.items.map((item) => ({
        providerId: item.providerId,
        sourceProductId: item.sourceProductId,
        name: item.name,
        brand: item.brand ?? null,
        ean: item.ean ?? null,
        categoryTrail: item.categoryTrail,
        categoryId: item.categoryId,
        price: item.price,
        initialStock: item.initialStock,
        minStock: item.minStock,
        cost: item.cost ?? undefined,
        sourceImageUrl: item.sourceImageUrl ?? null,
        productUrl: item.productUrl ?? null,
      })),
    });

    const parsedResponse = importExternalProductsResponseDTOSchema.safeParse(result);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de importacion asistida.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ProductSourcingDomainError) {
      return errorResponse(400, {
        code: "product_sourcing_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrio un error inesperado al importar productos externos.",
    });
  }
}
