import {
  handleDeleteCategoryMappingRequest,
  handleListCategoryMappingsRequest,
  handleUpdateCategoryMappingRequest,
} from "@/modules/product-sourcing/presentation/handlers/categoryMappingsHandler";
import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";

export async function GET(request: Request): Promise<Response> {
  return handleListCategoryMappingsRequest(request, createProductSourcingRuntime);
}

export async function PATCH(request: Request): Promise<Response> {
  return handleUpdateCategoryMappingRequest(request, createProductSourcingRuntime);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleDeleteCategoryMappingRequest(request, createProductSourcingRuntime);
}
