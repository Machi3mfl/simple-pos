import { unstable_noStore as noStore } from "next/cache";
import { NextRequest } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";
import { handleSearchExternalProductsRequest } from "@/modules/product-sourcing/presentation/handlers/searchExternalProductsHandler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<Response> {
  noStore();
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["products.create_from_sourcing"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para buscar productos externos.",
    );
  }

  return handleSearchExternalProductsRequest(request, createProductSourcingRuntime);
}
