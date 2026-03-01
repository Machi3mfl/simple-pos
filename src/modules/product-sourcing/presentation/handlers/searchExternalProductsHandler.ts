import { NextResponse } from "next/server";

import { ExternalCatalogProviderError } from "../../application/ports/RetailerCatalogProvider";
import type { SearchExternalProductsUseCase } from "../../application/use-cases/SearchExternalProductsUseCase";
import { ProductSourcingDomainError } from "../../domain/errors/ProductSourcingDomainError";
import {
  productSourcingSearchQueryDTOSchema,
  productSourcingSearchResponseDTOSchema,
} from "../dtos/product-sourcing-search.dto";

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
}

interface SearchExternalProductsExecutor {
  execute: SearchExternalProductsUseCase["execute"];
}

interface ProductSourcingRuntime {
  readonly searchExternalProductsUseCase: SearchExternalProductsExecutor;
}

export type ProductSourcingRuntimeFactory = () => ProductSourcingRuntime;

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function handleSearchExternalProductsRequest(
  request: Request,
  runtimeFactory: ProductSourcingRuntimeFactory,
): Promise<Response> {
  const url = new URL(request.url);
  const parsedQuery = productSourcingSearchQueryDTOSchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La busqueda externa contiene parametros invalidos.",
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join(".") || "query",
        message: issue.message,
      })),
    });
  }

  try {
    const result = await runtimeFactory().searchExternalProductsUseCase.execute({
      query: parsedQuery.data.q,
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
    });

    const parsedResponse = productSourcingSearchResponseDTOSchema.safeParse(result);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de busqueda externa.",
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

    if (error instanceof ExternalCatalogProviderError) {
      return errorResponse(502, {
        code: error.code,
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrio un error inesperado al buscar productos externos.",
    });
  }
}
