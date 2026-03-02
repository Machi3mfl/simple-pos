import type { ZodTypeAny } from "zod";

import type { CatalogProductImageSource } from "../../application/ports/ProductImageAssetStore";
import {
  createProductDTOSchema,
  type CreateProductDTO,
} from "../dtos/create-product.dto";
import {
  updateProductDTOSchema,
  type UpdateProductDTO,
} from "../dtos/update-product.dto";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ParsedProductMutationSuccess<TData> {
  readonly success: true;
  readonly data: TData;
  readonly imageSource?: CatalogProductImageSource;
}

interface ParsedProductMutationFailure {
  readonly success: false;
  readonly code: "invalid_json" | "validation_error";
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[];
}

type ParsedProductMutationResult<TData> =
  | ParsedProductMutationSuccess<TData>
  | ParsedProductMutationFailure;

function isParsedProductMutationFailure(
  value: unknown,
): value is ParsedProductMutationFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false
  );
}

function parseOptionalStringField(formData: FormData, field: string): string | undefined {
  const value = formData.get(field);
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function parseOptionalNumberField(formData: FormData, field: string): number | undefined {
  const value = parseOptionalStringField(formData, field);
  if (value === undefined) {
    return undefined;
  }

  return Number(value);
}

function parseOptionalBooleanField(formData: FormData, field: string): boolean | undefined {
  const value = parseOptionalStringField(formData, field);
  if (value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

async function resolveImageSource(formData: FormData): Promise<CatalogProductImageSource | undefined> {
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    return {
      kind: "uploaded_file",
      originalFileName: file.name,
      contentType: file.type,
      bytes: await file.arrayBuffer(),
    };
  }

  const imageUrl = parseOptionalStringField(formData, "imageUrl");
  if (imageUrl) {
    return {
      kind: "remote_url",
      sourceImageUrl: imageUrl,
    };
  }

  return undefined;
}

function toValidationFailure(
  schema: ZodTypeAny,
  payload: unknown,
  message: string,
): ParsedProductMutationFailure | null {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return null;
  }

  return {
    success: false,
    code: "validation_error",
    message,
    details: parsed.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    })),
  };
}

async function parseJsonPayload(request: Request): Promise<unknown | ParsedProductMutationFailure> {
  try {
    return await request.json();
  } catch {
    return {
      success: false,
      code: "invalid_json",
      message: "El body de la request debe ser JSON válido.",
    };
  }
}

function isMultipartRequest(request: Request): boolean {
  return request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}

export async function parseCreateProductRequest(
  request: Request,
): Promise<ParsedProductMutationResult<CreateProductDTO>> {
  if (!isMultipartRequest(request)) {
    const payload = await parseJsonPayload(request);
    if (isParsedProductMutationFailure(payload)) {
      return payload;
    }

    const validationFailure = toValidationFailure(
      createProductDTOSchema,
      payload,
      "La validación del payload de alta de producto falló.",
    );
    if (validationFailure) {
      return validationFailure;
    }

    const parsed = createProductDTOSchema.parse(payload);
    return {
      success: true,
      data: parsed,
      imageSource: parsed.imageUrl
        ? {
            kind: "remote_url",
            sourceImageUrl: parsed.imageUrl,
          }
        : undefined,
    };
  }

  const formData = await request.formData();
  const imageSource = await resolveImageSource(formData);
  const payload = {
    sku: parseOptionalStringField(formData, "sku"),
    name: parseOptionalStringField(formData, "name"),
    categoryId: parseOptionalStringField(formData, "categoryId"),
    price: parseOptionalNumberField(formData, "price"),
    cost: parseOptionalNumberField(formData, "cost"),
    initialStock: parseOptionalNumberField(formData, "initialStock"),
    minStock: parseOptionalNumberField(formData, "minStock"),
    imageUrl:
      imageSource?.kind === "remote_url" ? imageSource.sourceImageUrl : undefined,
  };

  const validationFailure = toValidationFailure(
    createProductDTOSchema,
    payload,
    "La validación del payload de alta de producto falló.",
  );
  if (validationFailure) {
    return validationFailure;
  }

  return {
    success: true,
    data: createProductDTOSchema.parse(payload),
    imageSource,
  };
}

export async function parseUpdateProductRequest(
  request: Request,
): Promise<ParsedProductMutationResult<UpdateProductDTO>> {
  if (!isMultipartRequest(request)) {
    const payload = await parseJsonPayload(request);
    if (isParsedProductMutationFailure(payload)) {
      return payload;
    }

    const validationFailure = toValidationFailure(
      updateProductDTOSchema,
      payload,
      "La validación del payload de edición de producto falló.",
    );
    if (validationFailure) {
      return validationFailure;
    }

    const parsed = updateProductDTOSchema.parse(payload);
    return {
      success: true,
      data: parsed,
      imageSource: parsed.imageUrl
        ? {
            kind: "remote_url",
            sourceImageUrl: parsed.imageUrl,
          }
        : undefined,
    };
  }

  const formData = await request.formData();
  const imageSource = await resolveImageSource(formData);
  const payload = {
    sku: parseOptionalStringField(formData, "sku"),
    name: parseOptionalStringField(formData, "name"),
    categoryId: parseOptionalStringField(formData, "categoryId"),
    price: parseOptionalNumberField(formData, "price"),
    cost: parseOptionalNumberField(formData, "cost"),
    minStock: parseOptionalNumberField(formData, "minStock"),
    // Multipart file-only updates still need to cross the DTO boundary before the managed URL is generated.
    imageUrl:
      imageSource?.kind === "remote_url"
        ? imageSource.sourceImageUrl
        : imageSource?.kind === "uploaded_file"
          ? "uploaded-file"
          : undefined,
    isActive: parseOptionalBooleanField(formData, "isActive"),
  };

  const validationFailure = toValidationFailure(
    updateProductDTOSchema,
    payload,
    "La validación del payload de edición de producto falló.",
  );
  if (validationFailure) {
    return validationFailure;
  }

  return {
    success: true,
    data: updateProductDTOSchema.parse(payload),
    imageSource,
  };
}
