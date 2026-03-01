import { InvalidCategoryMappingRuleError } from "../errors/ProductSourcingDomainError";
import type { ExternalCatalogProviderId } from "./ExternalCatalogCandidate";

export interface CategoryMappingRulePrimitives {
  readonly id: string;
  readonly providerId: ExternalCatalogProviderId;
  readonly externalCategoryPath: string;
  readonly internalCategoryId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function normalizeRequired(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new InvalidCategoryMappingRuleError(`${field} is required`);
  }

  return normalized;
}

export class CategoryMappingRule {
  private constructor(private readonly props: CategoryMappingRulePrimitives) {}

  static create(
    props: Omit<CategoryMappingRulePrimitives, "createdAt" | "updatedAt"> & {
      createdAt?: string;
      updatedAt?: string;
    },
  ): CategoryMappingRule {
    const now = new Date().toISOString();

    return new CategoryMappingRule({
      id: normalizeRequired(props.id, "id"),
      providerId: props.providerId,
      externalCategoryPath: normalizeRequired(props.externalCategoryPath, "externalCategoryPath"),
      internalCategoryId: normalizeRequired(props.internalCategoryId, "internalCategoryId"),
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static rehydrate(props: CategoryMappingRulePrimitives): CategoryMappingRule {
    return new CategoryMappingRule(props);
  }

  toPrimitives(): CategoryMappingRulePrimitives {
    return { ...this.props };
  }
}
