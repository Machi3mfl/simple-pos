"use client";

import { ArrowLeft, ArrowRight, ChevronRight, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { showErrorToast, showSuccessToast } from "@/hooks/use-app-toast";
import { getFormControlValidationProps } from "@/lib/form-controls";
import {
  type BulkPriceUpdateResponse,
  useBulkPriceUpdate,
} from "@/modules/catalog/presentation/hooks/useBulkPriceUpdate";
import { useIncrementalReveal } from "@/shared/presentation/hooks/useIncrementalReveal";
import { useInfiniteScrollTrigger } from "@/shared/presentation/hooks/useInfiniteScrollTrigger";

interface BulkPriceUpdatePanelProps {
  readonly onPricesUpdated?: (result: BulkPriceUpdateResponse) => Promise<void> | void;
  readonly refreshToken?: number;
  readonly variant?: "panel" | "dialog";
}

type WizardStepId = "scope" | "adjustment" | "preview" | "confirm";

const wizardStepOrder: readonly WizardStepId[] = [
  "scope",
  "adjustment",
  "preview",
  "confirm",
];

function isWizardStepId(value: string): value is WizardStepId {
  return wizardStepOrder.includes(value as WizardStepId);
}

export function BulkPriceUpdatePanel({
  onPricesUpdated,
  refreshToken,
  variant = "panel",
}: BulkPriceUpdatePanelProps): JSX.Element {
  const { messages, formatCurrency, formatDateTime, labelForCategory } = useI18n();
  const {
    canApplyCurrentPreview,
    categories,
    categoryId,
    feedback,
    hasValidScopeSelection,
    isPreviewUpToDate,
    isLoadingProducts,
    isSubmitting,
    lastResult,
    mode,
    productNameById,
    products,
    preview,
    apply,
    reloadProducts,
    scopedProducts,
    scopeType,
    selectedProductIds,
    setCategoryId,
    setMode,
    setScopeType,
    setValue,
    shouldBlockByEmptyScope,
    toggleProductSelection,
    value,
  } = useBulkPriceUpdate({
    onPricesUpdated,
    refreshToken,
  });
  const [wizardStep, setWizardStep] = useState<WizardStepId>("scope");

  const selectionResetKey = products.map((product) => product.id).join(":");
  const {
    visibleItems: visibleSelectionProducts,
    hasMore: hasMoreSelectionProducts,
    loadMore: loadMoreSelectionProducts,
  } = useIncrementalReveal({
    items: products,
    initialCount: 16,
    step: 16,
    resetKey: selectionResetKey,
  });
  const {
    isObserverSupported: isBulkSelectionObserverSupported,
    setScrollRoot: setBulkSelectionScrollRoot,
    setSentinel: setBulkSelectionSentinel,
  } = useInfiniteScrollTrigger({
    enabled: scopeType === "selection",
    hasMore: hasMoreSelectionProducts,
    isLoading: false,
    onLoadMore: loadMoreSelectionProducts,
    triggerKey: `${selectionResetKey}:${visibleSelectionProducts.length}`,
  });

  const isValueValid = Number.isFinite(Number(value));
  const isCategoryInvalid = scopeType === "category" && categoryId.trim().length === 0;
  const isSelectionInvalid = scopeType === "selection" && selectedProductIds.length === 0;
  const step1Ready = hasValidScopeSelection && !shouldBlockByEmptyScope;
  const step2Ready = step1Ready && isValueValid;
  const adjustmentValueLabel =
    mode === "percentage"
      ? messages.catalog.bulkPriceUpdate.adjustmentInputLabels.percentage
      : mode === "fixed_amount"
        ? messages.catalog.bulkPriceUpdate.adjustmentInputLabels.fixed_amount
        : messages.catalog.bulkPriceUpdate.adjustmentInputLabels.set_price;
  const previewResult = lastResult?.previewOnly ? lastResult : null;
  const appliedResult = lastResult && !lastResult.previewOnly ? lastResult : null;
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const payload = {
      description: feedback.message,
      testId: "bulk-feedback",
    };

    if (feedback.type === "error") {
      showErrorToast(payload);
      return;
    }

    showSuccessToast(payload);
  }, [feedback]);

  useEffect(() => {
    if (wizardStep !== "preview") {
      return;
    }

    if (!step2Ready || isSubmitting || isPreviewUpToDate) {
      return;
    }

    void preview();
  }, [isPreviewUpToDate, isSubmitting, preview, step2Ready, wizardStep]);

  function canOpenStep(step: WizardStepId): boolean {
    if (step === "scope") {
      return true;
    }

    if (step === "adjustment") {
      return step1Ready;
    }

    if (step === "preview") {
      return step2Ready;
    }

    return canApplyCurrentPreview;
  }

  function onWizardStepChange(nextValue: string): void {
    if (!isWizardStepId(nextValue)) {
      return;
    }

    if (!canOpenStep(nextValue)) {
      return;
    }

    setWizardStep(nextValue);
  }

  const containerClassName =
    variant === "panel"
      ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5"
      : "space-y-4";

  return (
    <article className={containerClassName}>
      {variant === "panel" ? (
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {messages.catalog.bulkPriceUpdate.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {messages.catalog.bulkPriceUpdate.subtitle}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {messages.catalog.bulkPriceUpdate.eligibleProducts(scopedProducts.length)}
          </p>
        </header>
      ) : (
        <header className="space-y-3">
          <p className="text-sm text-slate-500">
            {messages.catalog.bulkPriceUpdate.wizard.processHint}
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {messages.catalog.bulkPriceUpdate.eligibleProducts(scopedProducts.length)}
          </div>
        </header>
      )}

      {isLoadingProducts ? (
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
          {messages.catalog.bulkPriceUpdate.loadingProducts}
        </p>
      ) : null}

      <Tabs value={wizardStep} onValueChange={onWizardStepChange} className="mt-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-4">
          {wizardStepOrder.map((step) => {
            const title =
              step === "scope"
                ? messages.catalog.bulkPriceUpdate.wizard.scopeStepTitle
                : step === "adjustment"
                  ? messages.catalog.bulkPriceUpdate.wizard.adjustmentStepTitle
                  : step === "preview"
                    ? messages.catalog.bulkPriceUpdate.wizard.reviewAction
                    : messages.catalog.bulkPriceUpdate.wizard.confirmAction;
            const isActive = wizardStep === step;
            const complete =
              step === "scope"
                ? step1Ready
                : step === "adjustment"
                  ? step2Ready
                  : step === "preview"
                    ? Boolean(previewResult)
                    : Boolean(appliedResult);

            return (
              <TabsTrigger
                key={step}
                value={step}
                data-testid={`bulk-wizard-step-${step}`}
                disabled={!canOpenStep(step)}
                className="h-auto justify-start rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <div className="w-full">
                  <p
                    className={`text-[0.72rem] font-semibold uppercase tracking-[0.14em] ${
                      isActive ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {title}
                  </p>
                  <span
                    className={
                      complete
                        ? isActive
                          ? "mt-1 inline-flex rounded-full border border-white/40 bg-white/15 px-2 py-0.5 text-[0.66rem] font-semibold text-white"
                          : "mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.66rem] font-semibold text-emerald-700"
                        : isActive
                          ? "mt-1 inline-flex rounded-full border border-white/35 bg-white/10 px-2 py-0.5 text-[0.66rem] font-semibold text-white/90"
                          : "mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.66rem] font-semibold text-slate-500"
                    }
                  >
                    {complete
                      ? messages.catalog.bulkPriceUpdate.wizard.stepReady
                      : messages.catalog.bulkPriceUpdate.wizard.stepPending}
                  </span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="scope" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {messages.catalog.bulkPriceUpdate.wizard.scopeStepTitle}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {messages.catalog.bulkPriceUpdate.wizard.scopeStepDescription}
              </p>
            </div>
            {scopeType === "selection" ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {messages.catalog.bulkPriceUpdate.wizard.selectedProducts(
                  selectedProductIds.length,
                )}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">
                {messages.common.labels.scope}
              </span>
              <select
                data-testid="bulk-scope-select"
                value={scopeType}
                onChange={(event) =>
                  setScopeType(event.target.value as "all" | "category" | "selection")
                }
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
              >
                <option value="all">{messages.catalog.bulkPriceUpdate.scopes.all}</option>
                <option value="category">{messages.catalog.bulkPriceUpdate.scopes.category}</option>
                <option value="selection">
                  {messages.catalog.bulkPriceUpdate.scopes.selection}
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">
                {messages.common.labels.category}
              </span>
              <select
                data-testid="bulk-category-select"
                {...getFormControlValidationProps(isCategoryInvalid)}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={scopeType !== "category" || categories.length === 0}
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {labelForCategory(category)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {shouldBlockByEmptyScope ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              {messages.catalog.bulkPriceUpdate.noProductsForScope}
            </p>
            ) : null}

          {scopeType === "selection" ? (
            <div
              className={[
                "mt-3 rounded-xl border p-3",
                isSelectionInvalid
                  ? "border-rose-300 bg-rose-50/60"
                  : "border-slate-200",
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {messages.catalog.bulkPriceUpdate.selectProducts}
              </p>
              <ul
                ref={setBulkSelectionScrollRoot}
                className="mt-3 grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2"
              >
                {visibleSelectionProducts.map((product) => {
                  const isChecked = selectedProductIds.includes(product.id);

                  return (
                    <li key={product.id}>
                      <label
                        data-testid={`bulk-selection-item-${product.id}`}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:border-blue-200"
                      >
                        <Checkbox
                          data-testid={`bulk-selection-checkbox-${product.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500"
                          style={
                            product.imageUrl
                              ? {
                                  backgroundImage: `url(${product.imageUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                          aria-hidden
                        >
                          {product.imageUrl ? null : <Package size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[0.98rem] font-semibold text-slate-900">
                            {product.name}
                          </p>
                          <p className="text-sm text-slate-500">{formatCurrency(product.price)}</p>
                        </div>
                      </label>
                    </li>
                  );
                })}
                {hasMoreSelectionProducts ? (
                  <li className="md:col-span-2">
                    <div
                      ref={setBulkSelectionSentinel}
                      data-testid="bulk-selection-infinite-scroll-sentinel"
                      className="h-2 w-full"
                      aria-hidden
                    />
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                      <span data-testid="bulk-selection-infinite-scroll-status">
                        {isBulkSelectionObserverSupported
                          ? messages.productsWorkspace.pagination.continueScrolling
                          : messages.catalog.bulkPriceUpdate.selectProducts}
                      </span>
                      {!isBulkSelectionObserverSupported ? (
                        <button
                          type="button"
                          onClick={loadMoreSelectionProducts}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700"
                        >
                          {messages.common.actions.loadMore}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              data-testid="bulk-wizard-next-from-scope"
              type="button"
              onClick={() => setWizardStep("adjustment")}
              disabled={!step1Ready}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
            >
              {messages.catalog.bulkPriceUpdate.wizard.nextAction}
              <ChevronRight size={16} />
            </button>
          </div>
        </TabsContent>

        <TabsContent
          value="adjustment"
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="mb-3">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {messages.catalog.bulkPriceUpdate.wizard.adjustmentStepTitle}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {messages.catalog.bulkPriceUpdate.wizard.adjustmentStepDescription}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">
                {messages.common.labels.mode}
              </span>
              <select
                data-testid="bulk-mode-select"
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "percentage" | "fixed_amount" | "set_price")
                }
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
              >
                <option value="percentage">
                  {messages.catalog.bulkPriceUpdate.modes.percentage}
                </option>
                <option value="fixed_amount">
                  {messages.catalog.bulkPriceUpdate.modes.fixed_amount}
                </option>
                <option value="set_price">{messages.catalog.bulkPriceUpdate.modes.set_price}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">
                {adjustmentValueLabel}
              </span>
              <input
                data-testid="bulk-value-input"
                {...getFormControlValidationProps(!isValueValid)}
                type="number"
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
              />
            </label>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">
                {messages.catalog.bulkPriceUpdate.wizard.scopeProductsInAdjustmentTitle}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {messages.catalog.bulkPriceUpdate.wizard.scopeProductsInAdjustmentHint(
                  scopedProducts.length,
                )}
              </p>
            </div>
            <ul className="max-h-48 space-y-2 overflow-y-auto p-3">
              {scopedProducts.map((product) => (
                <li
                  key={`adjustment-scope-${product.id}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500"
                      style={
                        product.imageUrl
                          ? {
                              backgroundImage: `url(${product.imageUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                      aria-hidden
                    >
                      {product.imageUrl ? null : <Package size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">{formatCurrency(product.price)}</p>
                    </div>
                  </div>
                </li>
              ))}
              {scopedProducts.length === 0 ? (
                <li className="text-sm text-slate-500">
                  {messages.catalog.bulkPriceUpdate.noProductsForScope}
                </li>
              ) : null}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button
              data-testid="bulk-wizard-back-to-scope"
              type="button"
              onClick={() => setWizardStep("scope")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              {messages.catalog.bulkPriceUpdate.wizard.backAction}
            </button>
            <button
              data-testid="bulk-wizard-next-to-preview"
              type="button"
              onClick={() => setWizardStep("preview")}
              disabled={!step2Ready}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
            >
              {messages.catalog.bulkPriceUpdate.wizard.reviewAction}
              <ChevronRight size={16} />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {messages.catalog.bulkPriceUpdate.wizard.reviewStepTitle}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {messages.catalog.bulkPriceUpdate.wizard.reviewStepDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid="bulk-preview-button"
              type="button"
              onClick={() => {
                void preview();
              }}
              disabled={isSubmitting || shouldBlockByEmptyScope || !step2Ready}
              className="min-h-11 rounded-xl border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-700 disabled:border-slate-200 disabled:text-slate-400"
            >
              {messages.catalog.bulkPriceUpdate.wizard.recalculateAction}
            </button>
            {previewResult && !canApplyCurrentPreview ? (
              <span className="text-xs font-semibold text-amber-700">
                {messages.catalog.bulkPriceUpdate.wizard.previewOutdated}
              </span>
            ) : null}
          </div>

          {!previewResult ? (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {messages.catalog.bulkPriceUpdate.wizard.previewEmpty}
            </p>
          ) : (
            <>
              <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                {messages.catalog.bulkPriceUpdate.wizard.previewServerHint}
              </p>
              <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {messages.catalog.bulkPriceUpdate.auditSummary.status}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {messages.catalog.bulkPriceUpdate.auditSummary.preview}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {messages.catalog.bulkPriceUpdate.auditSummary.actor}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {previewResult.appliedBy}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {messages.catalog.bulkPriceUpdate.auditSummary.timestamp}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDateTime(previewResult.appliedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {messages.catalog.bulkPriceUpdate.wizard.previewListTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {messages.catalog.bulkPriceUpdate.wizard.previewListHint}
                  </p>
                </div>
                <ul className="max-h-64 space-y-2 overflow-y-auto p-3">
                  {previewResult.items.map((item) => (
                    <li
                      key={item.productId}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500"
                          style={
                            productById.get(item.productId)?.imageUrl
                              ? {
                                  backgroundImage: `url(${productById.get(item.productId)?.imageUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                          aria-hidden
                        >
                          {productById.get(item.productId)?.imageUrl ? null : <Package size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {productNameById.get(item.productId) ?? messages.common.fallbacks.unknownProduct}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-sm">
                            <span className="text-slate-400 line-through">
                              {formatCurrency(item.oldPrice)}
                            </span>
                            <ArrowRight size={14} className="text-slate-400" />
                            <span className="font-semibold text-emerald-700">
                              {formatCurrency(item.newPrice)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                  {previewResult.items.length === 0 ? (
                    <li className="text-sm text-slate-500">
                      {messages.catalog.bulkPriceUpdate.noUpdatedItems}
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {messages.catalog.bulkPriceUpdate.invalidItems}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {messages.catalog.bulkPriceUpdate.wizard.invalidListHint}
                  </p>
                </div>
                <ul className="max-h-48 space-y-2 overflow-y-auto p-3">
                  {previewResult.invalidItems.map((item) => (
                    <li
                      key={`${item.productId}-${item.reason}`}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    >
                      <p className="font-semibold">
                        {productNameById.get(item.productId) ?? messages.common.fallbacks.unknownProduct}
                      </p>
                      <p className="mt-0.5 text-xs">{item.reason}</p>
                    </li>
                  ))}
                  {previewResult.invalidItems.length === 0 ? (
                    <li className="text-sm text-slate-500">
                      {messages.catalog.bulkPriceUpdate.noInvalidItems}
                    </li>
                  ) : null}
                </ul>
              </div>
            </>
          )}

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button
              data-testid="bulk-wizard-back-to-adjustment"
              type="button"
              onClick={() => setWizardStep("adjustment")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              {messages.catalog.bulkPriceUpdate.wizard.backAction}
            </button>
            <button
              data-testid="bulk-wizard-next-to-confirm"
              type="button"
              onClick={() => setWizardStep("confirm")}
              disabled={!canApplyCurrentPreview}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
            >
              {messages.catalog.bulkPriceUpdate.wizard.goToConfirmAction}
              <ChevronRight size={16} />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="confirm" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {messages.catalog.bulkPriceUpdate.wizard.confirmAction}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {messages.catalog.bulkPriceUpdate.wizard.previewListHint}
            </p>
          </div>

          {!canApplyCurrentPreview || !previewResult ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              {messages.catalog.bulkPriceUpdate.wizard.previewOutdated}
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {messages.catalog.bulkPriceUpdate.eligibleProducts(previewResult.items.length)}
              </div>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {previewResult.items.map((item) => (
                  <li
                    key={`confirm-${item.productId}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500"
                        style={
                          productById.get(item.productId)?.imageUrl
                            ? {
                                backgroundImage: `url(${productById.get(item.productId)?.imageUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                        aria-hidden
                      >
                        {productById.get(item.productId)?.imageUrl ? null : <Package size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {productNameById.get(item.productId) ?? messages.common.fallbacks.unknownProduct}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm">
                          <span className="text-slate-400 line-through">
                            {formatCurrency(item.oldPrice)}
                          </span>
                          <ArrowRight size={14} className="text-slate-400" />
                          <span className="font-semibold text-emerald-700">
                            {formatCurrency(item.newPrice)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
                {previewResult.items.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    {messages.catalog.bulkPriceUpdate.noUpdatedItems}
                  </li>
                ) : null}
              </ul>
            </>
          )}

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button
              data-testid="bulk-wizard-back-to-preview"
              type="button"
              onClick={() => setWizardStep("preview")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              {messages.catalog.bulkPriceUpdate.wizard.backAction}
            </button>
            <button
              data-testid="bulk-apply-button"
              type="button"
              onClick={() => {
                void apply();
              }}
              disabled={isSubmitting || !canApplyCurrentPreview}
              className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
            >
              {isSubmitting
                ? messages.common.states.applying
                : messages.catalog.bulkPriceUpdate.wizard.applyAction}
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {appliedResult ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {messages.catalog.bulkPriceUpdate.applied(appliedResult.updatedCount)}
        </div>
      ) : null}

      {variant === "panel" ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void reloadProducts();
            }}
            className="text-xs font-semibold text-blue-600"
          >
            {messages.common.actions.refresh}
          </button>
        </div>
      ) : null}
    </article>
  );
}
