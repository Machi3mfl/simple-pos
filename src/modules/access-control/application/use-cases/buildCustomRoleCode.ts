function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]+/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export function buildCustomRoleCode(name: string): string {
  const baseSlug = slugify(name).slice(0, 32) || "custom_role";
  const uniqueSuffix = crypto.randomUUID().slice(0, 8);

  return `custom_${baseSlug}_${uniqueSuffix}`;
}
