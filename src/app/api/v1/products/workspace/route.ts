import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { createProductsRuntime } from "@/modules/products/infrastructure/runtime/productsRuntime";
import { productsWorkspaceResponseDTOSchema } from "@/modules/products/presentation/dtos/products-workspace-response.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function parseBooleanParam(value: string | null): boolean | undefined {
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

function parsePositiveInt(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return undefined;
}

export async function GET(request: Request): Promise<Response> {
  noStore();
  const { listProductsWorkspaceUseCase } = createProductsRuntime();
  const url = new URL(request.url);
  const activeOnlyRaw = url.searchParams.get("activeOnly");
  const pageRaw = url.searchParams.get("page");
  const pageSizeRaw = url.searchParams.get("pageSize");
  const activeOnly = parseBooleanParam(activeOnlyRaw);
  const page = parsePositiveInt(pageRaw);
  const pageSize = parsePositiveInt(pageSizeRaw);
  const stockState = url.searchParams.get("stockState");
  const sort = url.searchParams.get("sort");
  const validationDetails: { field: string; message: string }[] = [];

  if (activeOnlyRaw !== null && activeOnly === undefined) {
    validationDetails.push({
      field: "activeOnly",
      message: "Se esperaba true o false.",
    });
  }

  if (pageRaw !== null && page === undefined) {
    validationDetails.push({
      field: "page",
      message: "Se esperaba un entero positivo.",
    });
  }

  if (pageSizeRaw !== null && pageSize === undefined) {
    validationDetails.push({
      field: "pageSize",
      message: "Se esperaba un entero positivo entre 1 y 100.",
    });
  }

  if (
    stockState !== null &&
    !["all", "with_stock", "low_stock", "out_of_stock", "inactive"].includes(stockState)
  ) {
    validationDetails.push({
      field: "stockState",
      message: "Se esperaba all, with_stock, low_stock, out_of_stock o inactive.",
    });
  }

  if (sort !== null && !["stock", "name", "recent", "price"].includes(sort)) {
    validationDetails.push({
      field: "sort",
      message: "Se esperaba stock, name, recent o price.",
    });
  }

  if (validationDetails.length > 0) {
    return errorResponse(400, {
      code: "validation_error",
      message: "Los filtros del workspace de productos son inválidos.",
      details: validationDetails,
    });
  }

  const result = await listProductsWorkspaceUseCase.execute({
    q: url.searchParams.get("q")?.trim() || undefined,
    categoryId: url.searchParams.get("categoryId")?.trim() || undefined,
    stockState: (stockState as
      | "all"
      | "with_stock"
      | "low_stock"
      | "out_of_stock"
      | "inactive"
      | null) ?? undefined,
    activeOnly,
    sort: (sort as "stock" | "name" | "recent" | "price" | null) ?? undefined,
    page,
    pageSize,
  });

  const parsedResponse = productsWorkspaceResponseDTOSchema.safeParse(result);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta viola el contrato del workspace de productos.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
