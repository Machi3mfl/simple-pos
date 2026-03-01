import { NextResponse } from "next/server";

import type { ListImportedProductHistoryUseCase } from "../../application/use-cases/ListImportedProductHistoryUseCase";
import { ProductSourcingDomainError } from "../../domain/errors/ProductSourcingDomainError";
import {
  listImportedProductHistoryQueryDTOSchema,
  listImportedProductHistoryResponseDTOSchema,
} from "../dtos/import-history.dto";

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
}

interface ImportHistoryRuntime {
  readonly listImportedProductHistoryUseCase: Pick<ListImportedProductHistoryUseCase, "execute">;
}

export type ImportHistoryRuntimeFactory = () => ImportHistoryRuntime;

function errorResponse(status: number, body: ApiErrorResponse): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function handleListImportedProductHistoryRequest(
  request: Request,
  runtimeFactory: ImportHistoryRuntimeFactory,
): Promise<Response> {
  const url = new URL(request.url);
  const parsedQuery = listImportedProductHistoryQueryDTOSchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "Los parametros del historial de imports son invalidos.",
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join(".") || "query",
        message: issue.message,
      })),
    });
  }

  try {
    const result = await runtimeFactory().listImportedProductHistoryUseCase.execute(
      parsedQuery.data,
    );
    const parsedResponse = listImportedProductHistoryResponseDTOSchema.safeParse(result);

    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato del historial de imports.",
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
      message: "Ocurrio un error inesperado al listar el historial de imports.",
    });
  }
}
