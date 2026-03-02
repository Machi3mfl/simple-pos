import { unstable_noStore as noStore } from "next/cache";

import { createProductSourcingRuntime } from "@/modules/product-sourcing/infrastructure/runtime/productSourcingRuntime";
import { handleSearchExternalProductsRequest } from "@/modules/product-sourcing/presentation/handlers/searchExternalProductsHandler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request): Promise<Response> {
  noStore();
  return handleSearchExternalProductsRequest(request, createProductSourcingRuntime);
}
