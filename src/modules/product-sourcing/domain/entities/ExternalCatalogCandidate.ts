import { InvalidExternalCatalogCandidateError } from "../errors/ProductSourcingDomainError";

export type ExternalCatalogProviderId = "carrefour";

export interface ExternalCatalogCandidatePrimitives {
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly name: string;
  readonly brand: string | null;
  readonly ean: string | null;
  readonly categoryTrail: readonly string[];
  readonly suggestedCategoryId: string | null;
  readonly imageUrl: string | null;
  readonly referencePrice: number | null;
  readonly referenceListPrice: number | null;
  readonly productUrl: string | null;
}

interface ExternalCatalogCandidateProps {
  readonly providerId: ExternalCatalogProviderId;
  readonly sourceProductId: string;
  readonly name: string;
  readonly brand?: string | null;
  readonly ean?: string | null;
  readonly categoryTrail?: readonly string[];
  readonly imageUrl?: string | null;
  readonly referencePrice?: number | null;
  readonly referenceListPrice?: number | null;
  readonly productUrl?: string | null;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeCategoryTrail(categoryTrail: readonly string[] | undefined): readonly string[] {
  if (!categoryTrail) {
    return [];
  }

  return categoryTrail
    .map((entry) => entry.trim())
    .filter((entry, index, current) => entry.length > 0 && current.indexOf(entry) === index);
}

function slugifySegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveSuggestedCategoryId(categoryTrail: readonly string[]): string | null {
  const lastTrail = categoryTrail.at(-1);
  if (!lastTrail) {
    return null;
  }

  const lastSegment = lastTrail
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .at(-1);

  if (!lastSegment) {
    return null;
  }

  const normalized = slugifySegment(lastSegment);
  return normalized.length > 0 ? normalized : null;
}

export class ExternalCatalogCandidate {
  private constructor(private readonly props: Required<ExternalCatalogCandidatePrimitives>) {}

  static create(props: ExternalCatalogCandidateProps): ExternalCatalogCandidate {
    const sourceProductId = props.sourceProductId.trim();
    const name = props.name.trim();

    if (sourceProductId.length === 0) {
      throw new InvalidExternalCatalogCandidateError("sourceProductId is required");
    }

    if (name.length === 0) {
      throw new InvalidExternalCatalogCandidateError("name is required");
    }

    const categoryTrail = normalizeCategoryTrail(props.categoryTrail);

    return new ExternalCatalogCandidate({
      providerId: props.providerId,
      sourceProductId,
      name,
      brand: normalizeOptionalString(props.brand),
      ean: normalizeOptionalString(props.ean),
      categoryTrail,
      suggestedCategoryId: resolveSuggestedCategoryId(categoryTrail),
      imageUrl: normalizeOptionalString(props.imageUrl),
      referencePrice: props.referencePrice ?? null,
      referenceListPrice: props.referenceListPrice ?? null,
      productUrl: normalizeOptionalString(props.productUrl),
    });
  }

  toPrimitives(): ExternalCatalogCandidatePrimitives {
    return {
      ...this.props,
      categoryTrail: [...this.props.categoryTrail],
    };
  }

  withSuggestedCategoryId(suggestedCategoryId: string | null): ExternalCatalogCandidate {
    return new ExternalCatalogCandidate({
      ...this.props,
      suggestedCategoryId,
    });
  }
}
