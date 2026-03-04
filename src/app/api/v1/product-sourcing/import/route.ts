import { NextRequest } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";
import { handleImportExternalProductsRequest } from "@/modules/product-sourcing/presentation/handlers/importExternalProductsHandler";

export async function POST(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["products.create_from_sourcing"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para importar productos desde sourcing.",
    );
  }

  const { importExternalProductsUseCase } = createProductSourcingRuntime();
  return handleImportExternalProductsRequest(request, importExternalProductsUseCase);
}
