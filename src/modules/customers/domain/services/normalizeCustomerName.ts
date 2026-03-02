const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;
const MULTISPACE_PATTERN = /\s+/g;

export function normalizeCustomerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .replace(MULTISPACE_PATTERN, " ")
    .trim()
    .toLocaleLowerCase("es");
}

export function isPotentialCustomerNameMatch(candidateName: string, query: string): boolean {
  const normalizedCandidate = normalizeCustomerName(candidateName);
  const normalizedQuery = normalizeCustomerName(query);

  if (normalizedCandidate.length === 0 || normalizedQuery.length === 0) {
    return false;
  }

  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    return true;
  }

  const candidateTokens = normalizedCandidate.split(" ");
  const queryTokens = normalizedQuery.split(" ");

  return queryTokens.some((queryToken) => {
    if (queryToken.length < 3) {
      return false;
    }

    return candidateTokens.some(
      (candidateToken) =>
        candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken),
    );
  });
}

export function scoreCustomerNameMatch(candidateName: string, query: string): number {
  const normalizedCandidate = normalizeCustomerName(candidateName);
  const normalizedQuery = normalizeCustomerName(query);

  if (normalizedCandidate === normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 1;
  }

  if (normalizedQuery.startsWith(normalizedCandidate)) {
    return 2;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 3;
  }

  return 4;
}
