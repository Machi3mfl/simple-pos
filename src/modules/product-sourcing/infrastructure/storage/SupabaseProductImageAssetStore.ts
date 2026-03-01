import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PersistExternalImageInput,
  PersistedExternalImageAsset,
  ProductImageAssetStore,
} from "../../application/ports/ProductImageAssetStore";
import {
  ExternalImageTooLargeError,
  InvalidExternalImageSourceError,
  UnsupportedExternalImageContentTypeError,
} from "../../domain/errors/ProductSourcingDomainError";

const PRODUCT_SOURCING_BUCKET = "product-sourcing-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_HOSTS_BY_PROVIDER: Record<PersistExternalImageInput["providerId"], readonly string[]> = {
  carrefour: ["carrefourar.vteximg.com.br", "carrefourar.vtexassets.com"],
};
const FILE_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface LoadedImagePayload {
  readonly bytes: ArrayBuffer;
  readonly contentType: string;
  readonly sizeBytes: number;
}

function normalizeContentType(value: string | null): string {
  const normalized = value?.split(";")[0]?.trim().toLowerCase() ?? "";
  return normalized;
}

function parseDataUrl(value: string): LoadedImagePayload {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) {
    throw new InvalidExternalImageSourceError("data URL malformed");
  }

  const contentType = normalizeContentType(match[1] ?? null);
  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new UnsupportedExternalImageContentTypeError(contentType || "unknown");
  }

  const buffer = Buffer.from(match[2] ?? "", "base64");
  if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw new ExternalImageTooLargeError(buffer.byteLength, MAX_IMAGE_SIZE_BYTES);
  }

  return {
    bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    contentType,
    sizeBytes: buffer.byteLength,
  };
}

async function fetchRemoteImage(input: PersistExternalImageInput): Promise<LoadedImagePayload> {
  const url = new URL(input.sourceImageUrl);
  if (url.protocol !== "https:") {
    throw new InvalidExternalImageSourceError("only https sources are allowed");
  }

  const allowedHosts = new Set(ALLOWED_HOSTS_BY_PROVIDER[input.providerId]);
  if (!allowedHosts.has(url.hostname)) {
    throw new InvalidExternalImageSourceError(`hostname ${url.hostname} is not allowlisted`);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new InvalidExternalImageSourceError(`download failed with status ${response.status}`);
  }

  const contentType = normalizeContentType(response.headers.get("content-type"));
  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new UnsupportedExternalImageContentTypeError(contentType || "unknown");
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw new ExternalImageTooLargeError(bytes.byteLength, MAX_IMAGE_SIZE_BYTES);
  }

  return {
    bytes,
    contentType,
    sizeBytes: bytes.byteLength,
  };
}

async function loadImagePayload(input: PersistExternalImageInput): Promise<LoadedImagePayload> {
  if (input.sourceImageUrl.startsWith("data:")) {
    return parseDataUrl(input.sourceImageUrl);
  }

  return fetchRemoteImage(input);
}

export class SupabaseProductImageAssetStore implements ProductImageAssetStore {
  constructor(private readonly client: SupabaseClient) {}

  async persistExternalImage(input: PersistExternalImageInput): Promise<PersistedExternalImageAsset> {
    await this.ensureBucket();

    const loaded = await loadImagePayload(input);
    const extension = FILE_EXTENSION_BY_CONTENT_TYPE[loaded.contentType];
    const storagePath = `${input.desiredObjectKey}.${extension}`;

    const { error } = await this.client.storage
      .from(PRODUCT_SOURCING_BUCKET)
      .upload(storagePath, loaded.bytes, {
        contentType: loaded.contentType,
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(`Failed to persist external image in Supabase storage: ${error.message}`);
    }

    const { data } = this.client.storage.from(PRODUCT_SOURCING_BUCKET).getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: data.publicUrl,
      contentType: loaded.contentType,
      sizeBytes: loaded.sizeBytes,
    };
  }

  private async ensureBucket(): Promise<void> {
    const { error: getBucketError } = await this.client.storage.getBucket(PRODUCT_SOURCING_BUCKET);
    if (!getBucketError) {
      return;
    }

    const { error: createBucketError } = await this.client.storage.createBucket(
      PRODUCT_SOURCING_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_IMAGE_CONTENT_TYPES),
      },
    );

    if (
      createBucketError &&
      !/exists|duplicate/i.test(createBucketError.message)
    ) {
      throw new Error(`Failed to ensure product sourcing bucket: ${createBucketError.message}`);
    }
  }
}
