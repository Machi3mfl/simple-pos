"use client";

interface ProductMutationImageFields {
  readonly imageUrl?: string;
  readonly imageFile?: File | null;
}

type ProductMutationScalar = string | number | boolean | null | undefined;

function appendScalarField(
  formData: FormData,
  field: string,
  value: ProductMutationScalar,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return;
    }

    formData.append(field, trimmedValue);
    return;
  }

  formData.append(field, String(value));
}

export function buildProductMutationFormData(
  fields: Record<string, ProductMutationScalar>,
  image: ProductMutationImageFields,
): FormData {
  const formData = new FormData();

  for (const [field, value] of Object.entries(fields)) {
    appendScalarField(formData, field, value);
  }

  if (image.imageFile) {
    formData.append("imageFile", image.imageFile, image.imageFile.name);
  } else if (image.imageUrl?.trim()) {
    formData.append("imageUrl", image.imageUrl.trim());
  }

  return formData;
}
