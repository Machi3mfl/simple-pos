"use client";

import { useEffect } from "react";

import { showErrorToast, showSuccessToast } from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { getFormControlValidationProps } from "@/lib/form-controls";
import { ManagedProductImageField } from "@/modules/catalog/presentation/components/ManagedProductImageField";
import {
  type ProductOnboardingFieldErrors,
  type ProductOnboardingProduct,
  useProductOnboarding,
} from "@/modules/catalog/presentation/hooks/useProductOnboarding";

interface ProductOnboardingPanelProps {
  readonly onProductCreated?: (product: ProductOnboardingProduct) => Promise<void> | void;
  readonly refreshToken?: number;
}

export function ProductOnboardingPanel({
  onProductCreated,
  refreshToken,
}: ProductOnboardingPanelProps): JSX.Element {
  const { messages, formatCurrency, labelForCategory } = useI18n();
  const {
    categories,
    fieldErrors,
    feedback,
    form,
    isLoadingProducts,
    isSubmitting,
    products,
    reloadProducts,
    setForm,
    shouldShowFieldErrors,
    submit,
  } = useProductOnboarding({
    onProductCreated,
    refreshToken,
  });

  function isInvalid(field: keyof ProductOnboardingFieldErrors): boolean {
    return shouldShowFieldErrors && Boolean(fieldErrors[field]);
  }

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const payload = {
      description: feedback.message,
      testId: "onboarding-feedback",
    };

    if (feedback.type === "error") {
      showErrorToast(payload);
      return;
    }

    showSuccessToast(payload);
  }, [feedback]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {messages.catalog.onboarding.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {messages.catalog.onboarding.subtitle}
          </p>
        </div>
      </header>

      <form className="mt-4 grid gap-3 md:grid-cols-2" noValidate onSubmit={submit}>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.catalog.onboarding.nameLabel}
          </span>
          <input
            data-testid="onboarding-name-input"
            {...getFormControlValidationProps(isInvalid("name"))}
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={messages.catalog.onboarding.namePlaceholder}
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.common.labels.category}
          </span>
          <select
            data-testid="onboarding-category-select"
            {...getFormControlValidationProps(isInvalid("categoryId"))}
            value={form.categoryId}
            onChange={(event) =>
              setForm((current) => ({ ...current, categoryId: event.target.value }))
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          >
            {categories.map((option) => (
              <option key={option} value={option}>
                {labelForCategory(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.catalog.onboarding.priceLabel}
          </span>
          <input
            data-testid="onboarding-price-input"
            {...getFormControlValidationProps(isInvalid("price"))}
            type="number"
            step="0.01"
            min="0.01"
            value={form.price}
            onChange={(event) =>
              setForm((current) => ({ ...current, price: event.target.value }))
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.catalog.onboarding.costLabel}
          </span>
          <input
            data-testid="onboarding-cost-input"
            {...getFormControlValidationProps(isInvalid("cost"))}
            type="number"
            step="0.01"
            min="0.01"
            value={form.cost}
            onChange={(event) =>
              setForm((current) => ({ ...current, cost: event.target.value }))
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            {messages.catalog.onboarding.initialStockLabel}
          </span>
          <input
            data-testid="onboarding-stock-input"
            {...getFormControlValidationProps(isInvalid("initialStock"))}
            type="number"
            min="0"
            step="1"
            value={form.initialStock}
            onChange={(event) =>
              setForm((current) => ({ ...current, initialStock: event.target.value }))
            }
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
          />
        </label>

        <ManagedProductImageField
          className="md:col-span-2"
          label={messages.catalog.onboarding.imageUrlLabel}
          previewAlt={form.name.trim() || messages.catalog.onboarding.title}
          imageUrl={form.imageUrl}
          imageFile={form.imageFile}
          urlInputTestId="onboarding-image-input"
          fileInputTestId="onboarding-image-file-input"
          onImageUrlChange={(value) =>
            setForm((current) => ({ ...current, imageUrl: value }))
          }
          onImageFileChange={(file) =>
            setForm((current) => ({ ...current, imageFile: file }))
          }
        />

        <div className="md:col-span-2">
          <button
            data-testid="onboarding-submit-button"
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
          >
            {isSubmitting ? messages.common.states.creating : messages.common.actions.createProduct}
          </button>
        </div>
      </form>

      <div className="mt-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-700">
            {messages.catalog.onboarding.recentProducts}
          </p>
          <button
            type="button"
            onClick={() => {
              void reloadProducts();
            }}
            disabled={isLoadingProducts}
            className="text-xs font-semibold text-blue-600 disabled:text-slate-400"
          >
            {isLoadingProducts ? messages.common.states.loading : messages.common.actions.refresh}
          </button>
        </div>

        <ul className="max-h-52 space-y-1 overflow-y-auto p-2">
          {products.slice(0, 8).map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-700"
            >
              <span className="min-w-0 truncate">
                {product.name} ({labelForCategory(product.categoryId)})
              </span>
              <span className="ml-2 shrink-0 font-semibold text-slate-900">
                {formatCurrency(product.price)}
              </span>
            </li>
          ))}

          {products.length === 0 && !isLoadingProducts ? (
            <li className="px-2 py-2 text-xs text-slate-500">
              {messages.catalog.onboarding.emptyProducts}
            </li>
          ) : null}
        </ul>
      </div>
    </article>
  );
}
