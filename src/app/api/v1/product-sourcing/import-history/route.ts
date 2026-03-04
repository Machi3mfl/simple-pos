import { NextRequest } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";
import { handleListImportedProductHistoryRequest } from "@/modules/product-sourcing/presentation/handlers/importHistoryHandler";

export async function GET(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["products.create_from_sourcing"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para consultar el historial de sourcing.",
    );
  }

  return handleListImportedProductHistoryRequest(request, createProductSourcingRuntime);
}
