"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { getFormControlValidationProps } from "@/lib/form-controls";
import {
  dedupeCategoryCodes,
  formatCategoryLabel,
  resolveCategoryCodeFromInput,
  resolveCategoryLabelFromInput,
  type CategoryOption,
} from "@/shared/core/category/categoryNaming";

interface CategoryInputFieldProps {
  readonly categoryCode: string;
  readonly inputTestId: string;
  readonly knownCategoryCodes: readonly string[];
  readonly label: string;
  readonly onCategoryCodeChange: (nextCategoryCode: string) => void;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly invalid?: boolean;
}

function buildOptionId(inputTestId: string): string {
  return `${inputTestId}-list`;
}

export function CategoryInputField({
  categoryCode,
  inputTestId,
  knownCategoryCodes,
  label,
  onCategoryCodeChange,
  placeholder = "Ej. Desayuno y merienda",
  required = false,
  invalid = false,
}: CategoryInputFieldProps): JSX.Element {
  const { labelForCategory } = useI18n();
  const [draftValue, setDraftValue] = useState<string>("");

  const options = useMemo<readonly CategoryOption[]>(
    () =>
      dedupeCategoryCodes(knownCategoryCodes).map((code) => ({
        code,
        label: labelForCategory(code),
      })),
    [knownCategoryCodes, labelForCategory],
  );

  useEffect(() => {
    const resolvedFromDraft = resolveCategoryCodeFromInput(draftValue, options);
    if (draftValue.trim().length > 0 && resolvedFromDraft === categoryCode) {
      return;
    }

    const matchedOption = options.find((option) => option.code === categoryCode);
    setDraftValue(matchedOption?.label ?? formatCategoryLabel(categoryCode));
  }, [categoryCode, draftValue, options]);

  const resolvedCategoryCode = useMemo(
    () => resolveCategoryCodeFromInput(draftValue, options),
    [draftValue, options],
  );
  const resolvedCategoryLabel = useMemo(
    () => resolveCategoryLabelFromInput(draftValue, options),
    [draftValue, options],
  );

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        data-testid={inputTestId}
        required={required}
        {...getFormControlValidationProps(invalid)}
        value={draftValue}
        onChange={(event) => {
          const nextDraftValue = event.target.value;
          setDraftValue(nextDraftValue);
          onCategoryCodeChange(resolveCategoryCodeFromInput(nextDraftValue, options));
        }}
        onBlur={() => {
          if (draftValue.trim().length === 0) {
            return;
          }

          setDraftValue(resolvedCategoryLabel);
        }}
        list={buildOptionId(inputTestId)}
        placeholder={placeholder}
        className="min-h-[3.4rem] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
      />
      <datalist id={buildOptionId(inputTestId)}>
        {options.map((option) => (
          <option key={option.code} value={option.label}>
            {option.code}
          </option>
        ))}
      </datalist>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">
          {resolvedCategoryLabel.length > 0 ? resolvedCategoryLabel : "Sin categoría definida"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Código guardado: {resolvedCategoryCode.length > 0 ? resolvedCategoryCode : "pendiente"}
        </p>
      </div>
    </label>
  );
}
