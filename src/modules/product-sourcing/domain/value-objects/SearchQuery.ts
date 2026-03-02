import { InvalidSearchQueryError } from "../errors/ProductSourcingDomainError";

function normalizeQuery(rawValue: string): string {
  return rawValue.trim().replace(/\s+/g, " ");
}

export class SearchQuery {
  private constructor(readonly value: string) {}

  static create(rawValue: string): SearchQuery {
    const normalized = normalizeQuery(rawValue);
    const meaningfulLength = normalized.replace(/\s/g, "").length;

    if (meaningfulLength < 3) {
      throw new InvalidSearchQueryError();
    }

    return new SearchQuery(normalized);
  }
}
