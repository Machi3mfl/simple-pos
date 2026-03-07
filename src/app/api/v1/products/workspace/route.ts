import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
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

export async function GET(request: NextRequest): Promise<Response> {
  noStore();
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
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
  const normalizedSort = sort === "stock" ? "stock_asc" : sort;
  const hasFullProductsAccess = actorHasAnyPermission(actorSnapshot, ["products.view"]);
  const hasInventorySummaryAccess = actorHasAnyPermission(actorSnapshot, [
    "inventory.value.view",
    "reporting.executive.view",
    "reporting.operational.view",
  ]);
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

  if (
    normalizedSort !== null &&
    !["stock_asc", "stock_desc", "name", "recent", "price"].includes(normalizedSort)
  ) {
    validationDetails.push({
      field: "sort",
      message: "Se esperaba stock_asc, stock_desc, name, recent o price.",
    });
  }

  if (validationDetails.length > 0) {
    return errorResponse(400, {
      code: "validation_error",
      message: "Los filtros del workspace de productos son inválidos.",
      details: validationDetails,
    });
  }

  if (!hasFullProductsAccess && !hasInventorySummaryAccess) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para consultar el workspace de productos.",
    );
  }

  const isSummaryOnlyRequest =
    !url.searchParams.get("q") &&
    !url.searchParams.get("categoryId") &&
    (stockState === null || stockState === "all") &&
    (normalizedSort === null || normalizedSort === "stock_asc");

  if (!hasFullProductsAccess && !isSummaryOnlyRequest) {
    return forbiddenPermissionResponse(
      "El operador actual solo puede consultar el resumen valorizado de inventario.",
    );
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
    sort:
      (normalizedSort as "stock_asc" | "stock_desc" | "name" | "recent" | "price" | null) ??
      undefined,
    page,
    pageSize,
  });
  const responseBody = hasFullProductsAccess
    ? result
    : {
        ...result,
        items: [],
      };
  const canViewInventoryCost = actorHasAnyPermission(actorSnapshot, ["inventory.cost.view"]);
  const sanitizedResponseBody = canViewInventoryCost
    ? responseBody
    : {
        ...responseBody,
        items: responseBody.items.map((item) => ({
          ...item,
          averageCost: 0,
        })),
      };

  const parsedResponse = productsWorkspaceResponseDTOSchema.safeParse(
    sanitizedResponseBody,
  );
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta viola el contrato del workspace de productos.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
