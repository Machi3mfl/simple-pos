import { ExternalCatalogCandidate, type ExternalCatalogProviderId } from "../../../domain/entities/ExternalCatalogCandidate";
import {
  ExternalCatalogProviderError,
  type RetailerCatalogProvider,
  type SearchRetailerCatalogInput,
  type SearchRetailerCatalogResult,
} from "../../../application/ports/RetailerCatalogProvider";

export type ProductSourcingFetch = typeof fetch;

interface VtexCatalogProviderConfig {
  readonly providerId: ExternalCatalogProviderId;
  readonly baseUrl: string;
  readonly fetchFn?: ProductSourcingFetch;
}

interface RawVtexImage {
  readonly imageUrl?: string;
}

interface RawVtexCommercialOffer {
  readonly Price?: number;
  readonly ListPrice?: number;
}

interface RawVtexSeller {
  readonly commertialOffer?: RawVtexCommercialOffer;
}

interface RawVtexSkuItem {
  readonly ean?: string;
  readonly images?: readonly RawVtexImage[];
  readonly sellers?: readonly RawVtexSeller[];
}

interface RawVtexProduct {
  readonly productId?: string | number;
  readonly productName?: string;
  readonly brand?: string;
  readonly categories?: readonly string[];
  readonly items?: readonly RawVtexSkuItem[];
  readonly link?: string;
}

function toAbsoluteUrl(baseUrl: string, rawValue: string | undefined): string | null {
  if (!rawValue || rawValue.trim().length === 0) {
    return null;
  }

  try {
    return new URL(rawValue, baseUrl).toString();
  } catch {
    return null;
  }
}

export abstract class VtexCatalogProvider implements RetailerCatalogProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: ProductSourcingFetch;

  constructor(private readonly config: VtexCatalogProviderConfig) {
    this.baseUrl = config.baseUrl;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async search(input: SearchRetailerCatalogInput): Promise<SearchRetailerCatalogResult> {
    const endpoint = new URL(
      `/api/catalog_system/pub/products/search/${encodeURIComponent(input.query.value)}`,
      this.baseUrl,
    );
    const from = (input.page - 1) * input.pageSize;
    const to = from + input.pageSize - 1;

    endpoint.searchParams.set("_from", String(from));
    endpoint.searchParams.set("_to", String(to));

    let response: Response;
    try {
      response = await this.fetchFn(endpoint, {
        headers: {
          accept: "application/json",
        },
        cache: "no-store",
      });
    } catch (error: unknown) {
      throw new ExternalCatalogProviderError(
        "provider_request_failed",
        "No se pudo consultar el catalogo externo configurado.",
        undefined,
      );
    }

    if (!response.ok) {
      throw new ExternalCatalogProviderError(
        "provider_request_failed",
        "El proveedor externo rechazo la busqueda solicitada.",
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ExternalCatalogProviderError(
        "provider_payload_invalid",
        "El proveedor externo devolvio un payload invalido.",
        response.status,
      );
    }

    if (!Array.isArray(payload)) {
      throw new ExternalCatalogProviderError(
        "provider_payload_invalid",
        "El proveedor externo devolvio un formato no soportado.",
        response.status,
      );
    }

    const items = payload
      .map((entry) => this.normalizeCandidate(entry as RawVtexProduct))
      .filter((candidate): candidate is ExternalCatalogCandidate => candidate !== null);

    return {
      providerId: this.config.providerId,
      items,
      page: input.page,
      pageSize: input.pageSize,
      hasMore: items.length === input.pageSize,
    };
  }

  private normalizeCandidate(raw: RawVtexProduct): ExternalCatalogCandidate | null {
    const firstItem = raw.items?.[0];
    const firstImage = firstItem?.images?.[0];
    const commercialOffer = firstItem?.sellers?.[0]?.commertialOffer;
    const sourceProductId = String(raw.productId ?? "").trim();
    const name = raw.productName?.trim() ?? "";

    if (sourceProductId.length === 0 || name.length === 0) {
      return null;
    }

    return ExternalCatalogCandidate.create({
      providerId: this.config.providerId,
      sourceProductId,
      name,
      brand: raw.brand,
      ean: firstItem?.ean,
      categoryTrail: Array.isArray(raw.categories) ? raw.categories : [],
      imageUrl: toAbsoluteUrl(this.baseUrl, firstImage?.imageUrl),
      referencePrice: commercialOffer?.Price ?? null,
      referenceListPrice: commercialOffer?.ListPrice ?? null,
      productUrl: toAbsoluteUrl(this.baseUrl, raw.link),
    });
  }
}
