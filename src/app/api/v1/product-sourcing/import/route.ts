import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";
import { handleImportExternalProductsRequest } from "@/modules/product-sourcing/presentation/handlers/importExternalProductsHandler";

export async function POST(request: Request): Promise<Response> {
  const { importExternalProductsUseCase } = createProductSourcingRuntime();
  return handleImportExternalProductsRequest(request, importExternalProductsUseCase);
}
