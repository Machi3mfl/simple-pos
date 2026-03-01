import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";
import { handleListImportedProductHistoryRequest } from "@/modules/product-sourcing/presentation/handlers/importHistoryHandler";

export async function GET(request: Request): Promise<Response> {
  return handleListImportedProductHistoryRequest(request, createProductSourcingRuntime);
}
