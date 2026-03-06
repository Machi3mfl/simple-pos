export interface FormValidationIssue<TField extends string = string> {
  readonly field: TField;
  readonly message: string;
}

export interface FormValidationResult<TField extends string = string> {
  readonly issues: readonly FormValidationIssue<TField>[];
  readonly errorsByField: Partial<Record<TField, string>>;
  readonly firstIssue: FormValidationIssue<TField> | null;
  readonly hasErrors: boolean;
}

export function buildFormValidationResult<TField extends string>(
  issues: readonly FormValidationIssue<TField>[],
): FormValidationResult<TField> {
  const errorsByField: Partial<Record<TField, string>> = {};

  for (const issue of issues) {
    if (errorsByField[issue.field] === undefined) {
      errorsByField[issue.field] = issue.message;
    }
  }

  return {
    issues,
    errorsByField,
    firstIssue: issues[0] ?? null,
    hasErrors: issues.length > 0,
  };
}
