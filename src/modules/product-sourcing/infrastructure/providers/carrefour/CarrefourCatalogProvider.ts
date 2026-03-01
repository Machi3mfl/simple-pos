import { VtexCatalogProvider, type ProductSourcingFetch } from "../vtex/VtexCatalogProvider";

const CARREFOUR_BASE_URL = "https://www.carrefour.com.ar";

export class CarrefourCatalogProvider extends VtexCatalogProvider {
  constructor(fetchFn?: ProductSourcingFetch) {
    super({
      providerId: "carrefour",
      baseUrl: CARREFOUR_BASE_URL,
      fetchFn,
    });
  }
}
