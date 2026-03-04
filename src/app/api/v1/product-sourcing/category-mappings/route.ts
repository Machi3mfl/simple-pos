import { NextRequest } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import {
  handleDeleteCategoryMappingRequest,
  handleListCategoryMappingsRequest,
  handleUpdateCategoryMappingRequest,
} from "@/modules/product-sourcing/presentation/handlers/categoryMappingsHandler";
import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";

async function ensureSourcingAccess(request: NextRequest): Promise<Response | null> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["products.create_from_sourcing"])) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para administrar sourcing.",
    );
  }

  return null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const deniedResponse = await ensureSourcingAccess(request);
  if (deniedResponse) {
    return deniedResponse;
  }

  return handleListCategoryMappingsRequest(request, createProductSourcingRuntime);
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const deniedResponse = await ensureSourcingAccess(request);
  if (deniedResponse) {
    return deniedResponse;
  }

  return handleUpdateCategoryMappingRequest(request, createProductSourcingRuntime);
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const deniedResponse = await ensureSourcingAccess(request);
  if (deniedResponse) {
    return deniedResponse;
  }

  return handleDeleteCategoryMappingRequest(request, createProductSourcingRuntime);
}
