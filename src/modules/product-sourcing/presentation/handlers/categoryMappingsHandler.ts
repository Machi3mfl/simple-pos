import { NextResponse } from "next/server";

import type { DeleteExternalCategoryMappingUseCase } from "../../application/use-cases/DeleteExternalCategoryMappingUseCase";
import type { ListExternalCategoryMappingsUseCase } from "../../application/use-cases/ListExternalCategoryMappingsUseCase";
import type { UpdateExternalCategoryMappingUseCase } from "../../application/use-cases/UpdateExternalCategoryMappingUseCase";
import { ProductSourcingDomainError } from "../../domain/errors/ProductSourcingDomainError";
import {
  categoryMappingItemDTOSchema,
  deleteCategoryMappingDTOSchema,
  listCategoryMappingsQueryDTOSchema,
  listCategoryMappingsResponseDTOSchema,
  updateCategoryMappingDTOSchema,
} from "../dtos/category-mappings.dto";

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
}

interface CategoryMappingsRuntime {
  readonly listExternalCategoryMappingsUseCase: Pick<
    ListExternalCategoryMappingsUseCase,
    "execute"
  >;
  readonly updateExternalCategoryMappingUseCase: Pick<
    UpdateExternalCategoryMappingUseCase,
    "execute"
  >;
  readonly deleteExternalCategoryMappingUseCase: Pick<
    DeleteExternalCategoryMappingUseCase,
    "execute"
  >;
}

export type CategoryMappingsRuntimeFactory = () => CategoryMappingsRuntime;

function errorResponse(status: number, body: ApiErrorResponse): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function handleListCategoryMappingsRequest(
  request: Request,
  runtimeFactory: CategoryMappingsRuntimeFactory,
): Promise<Response> {
  const url = new URL(request.url);
  const parsedQuery = listCategoryMappingsQueryDTOSchema.safeParse({
    providerId: url.searchParams.get("providerId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsedQuery.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "Los parametros del listado de mappings son invalidos.",
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join(".") || "query",
        message: issue.message,
      })),
    });
  }

  try {
    const result = await runtimeFactory().listExternalCategoryMappingsUseCase.execute(
      parsedQuery.data,
    );
    const parsedResponse = listCategoryMappingsResponseDTOSchema.safeParse(result);

    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de category mappings.",
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
      message: "Ocurrio un error inesperado al listar category mappings.",
    });
  }
}

export async function handleUpdateCategoryMappingRequest(
  request: Request,
  runtimeFactory: CategoryMappingsRuntimeFactory,
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

  const parsedBody = updateCategoryMappingDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La actualizacion del mapping contiene datos invalidos.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const result = await runtimeFactory().updateExternalCategoryMappingUseCase.execute(
      parsedBody.data,
    );
    const parsedResponse = categoryMappingItemDTOSchema.safeParse(result);

    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato de update category mapping.",
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
      message: "Ocurrio un error inesperado al actualizar category mappings.",
    });
  }
}

export async function handleDeleteCategoryMappingRequest(
  request: Request,
  runtimeFactory: CategoryMappingsRuntimeFactory,
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

  const parsedBody = deleteCategoryMappingDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "La eliminacion del mapping contiene datos invalidos.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    await runtimeFactory().deleteExternalCategoryMappingUseCase.execute(parsedBody.data);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof ProductSourcingDomainError) {
      return errorResponse(400, {
        code: "product_sourcing_rule_error",
        message: error.message,
      });
    }

    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrio un error inesperado al eliminar category mappings.",
    });
  }
}
