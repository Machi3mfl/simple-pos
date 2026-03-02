import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PersistCatalogProductImageInput,
  PersistedCatalogProductImageAsset,
  ProductImageAssetStore,
} from "../../application/ports/ProductImageAssetStore";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FILE_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export class CatalogProductImageInputError extends Error {}

interface LoadedImagePayload {
  readonly bytes: ArrayBuffer;
  readonly contentType: string;
  readonly sizeBytes: number;
}

function normalizeContentType(value: string | null): string {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function validateContentType(contentType: string): void {
  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new CatalogProductImageInputError(
      `El tipo de imagen ${contentType || "desconocido"} no está soportado.`,
    );
  }
}

function validateSize(sizeBytes: number): void {
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new CatalogProductImageInputError(
      `La imagen supera el máximo permitido de ${MAX_IMAGE_SIZE_BYTES} bytes.`,
    );
  }
}

function parseDataUrl(value: string): LoadedImagePayload {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) {
    throw new CatalogProductImageInputError("La URL de imagen no tiene un formato válido.");
  }

  const contentType = normalizeContentType(match[1] ?? null);
  validateContentType(contentType);

  const buffer = Buffer.from(match[2] ?? "", "base64");
  validateSize(buffer.byteLength);

  return {
    bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    contentType,
    sizeBytes: buffer.byteLength,
  };
}

function validateUploadedImage(input: {
  readonly bytes: ArrayBuffer;
  readonly contentType: string;
}): LoadedImagePayload {
  const contentType = normalizeContentType(input.contentType);
  validateContentType(contentType);
  validateSize(input.bytes.byteLength);

  return {
    bytes: input.bytes,
    contentType,
    sizeBytes: input.bytes.byteLength,
  };
}

async function fetchRemoteImage(sourceImageUrl: string): Promise<LoadedImagePayload> {
  if (sourceImageUrl.startsWith("data:")) {
    return parseDataUrl(sourceImageUrl);
  }

  let url: URL;
  try {
    url = new URL(sourceImageUrl);
  } catch {
    throw new CatalogProductImageInputError("La URL de imagen no es válida.");
  }

  const isLocalhost =
    LOCALHOST_HOSTNAMES.has(url.hostname) || url.hostname.endsWith(".localhost");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost)) {
    throw new CatalogProductImageInputError(
      "La URL de imagen debe usar https o http local de desarrollo.",
    );
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new CatalogProductImageInputError(
      `No se pudo descargar la imagen remota (status ${response.status}).`,
    );
  }

  const contentType = normalizeContentType(response.headers.get("content-type"));
  validateContentType(contentType);

  const bytes = await response.arrayBuffer();
  validateSize(bytes.byteLength);

  return {
    bytes,
    contentType,
    sizeBytes: bytes.byteLength,
  };
}

export class SupabaseCatalogProductImageAssetStore implements ProductImageAssetStore {
  constructor(private readonly client: SupabaseClient) {}

  async persistImage(
    input: PersistCatalogProductImageInput,
  ): Promise<PersistedCatalogProductImageAsset> {
    await this.ensureBucket();

    const loaded =
      input.source.kind === "uploaded_file"
        ? validateUploadedImage({
            bytes: input.source.bytes,
            contentType: input.source.contentType,
          })
        : await fetchRemoteImage(input.source.sourceImageUrl);

    const extension = FILE_EXTENSION_BY_CONTENT_TYPE[loaded.contentType];
    const storagePath = `${input.desiredObjectKey}.${extension}`;

    const { error } = await this.client.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(storagePath, loaded.bytes, {
        contentType: loaded.contentType,
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(`Failed to persist product image in Supabase storage: ${error.message}`);
    }

    const { data } = this.client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: data.publicUrl,
      contentType: loaded.contentType,
      sizeBytes: loaded.sizeBytes,
    };
  }

  private async ensureBucket(): Promise<void> {
    const { error: getBucketError } = await this.client.storage.getBucket(PRODUCT_IMAGES_BUCKET);
    if (!getBucketError) {
      return;
    }

    const { error: createBucketError } = await this.client.storage.createBucket(
      PRODUCT_IMAGES_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_IMAGE_CONTENT_TYPES),
      },
    );

    if (createBucketError && !/exists|duplicate/i.test(createBucketError.message)) {
      throw new Error(`Failed to ensure product images bucket: ${createBucketError.message}`);
    }
  }
}
