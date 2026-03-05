"use client";

import { ArrowLeft, ArrowRight, ChevronRight, Package } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showErrorToast, showSuccessToast } from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";
import {
  dedupeCategoryCodes,
  sortCategoryCodes,
} from "@/shared/core/category/categoryNaming";
import { useIncrementalReveal } from "@/shared/presentation/hooks/useIncrementalReveal";
import { useInfiniteScrollTrigger } from "@/shared/presentation/hooks/useInfiniteScrollTrigger";

interface BulkProductItem {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

interface ProductListResponse {
  readonly items: readonly BulkProductItem[];
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface BulkProductDraft {
  readonly name: string;
  readonly price: string;
  readonly cost: string;
  readonly minStock: string;
  readonly targetStock: string;
  readonly isActive: boolean;
}

interface BulkProductApplyResult {
  readonly updatedProducts: number;
  readonly adjustedStockProducts: number;
  readonly failedProducts: number;
}

interface BulkProductProfileUpdatePanelProps {
  readonly canAdjustStock: boolean;
  readonly onProfilesUpdated?: (result: BulkProductApplyResult) => Promise<void> | void;
  readonly refreshToken?: number;
}

type ScopeType = "all" | "category" | "selection";
type WizardStepId = "scope" | "edit" | "confirm";

interface BulkProfileFeedback {
  readonly type: "success" | "error";
  readonly message: string;
}

interface DraftPlan {
  readonly patch: Record<string, unknown>;
  readonly stockDelta: number;
  readonly changes: readonly DraftPlanChange[];
}

interface DraftPlanChange {
  readonly label: string;
  readonly before: string;
  readonly after: string;
}

const wizardStepOrder: readonly WizardStepId[] = ["scope", "edit", "confirm"];

function isWizardStepId(value: string): value is WizardStepId {
  return wizardStepOrder.includes(value as WizardStepId);
}

function toDefaultDraft(product: BulkProductItem): BulkProductDraft {
  return {
    name: product.name,
    price: product.price.toFixed(2),
    cost: product.cost === undefined ? "" : product.cost.toFixed(2),
    minStock: String(product.minStock),
    targetStock: String(product.stock),
    isActive: product.isActive,
  };
}

function resolveApiMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof (payload as ApiErrorPayload).message === "string"
  ) {
    return (payload as ApiErrorPayload).message as string;
  }

  return fallback;
}

export function BulkProductProfileUpdatePanel({
  canAdjustStock,
  onProfilesUpdated,
  refreshToken,
}: BulkProductProfileUpdatePanelProps): JSX.Element {
  const { messages, formatCurrency, labelForCategory } = useI18n();
  const [products, setProducts] = useState<readonly BulkProductItem[]>([]);
  const [scopeType, setScopeType] = useState<ScopeType>("category");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<readonly string[]>([]);
  const [draftByProductId, setDraftByProductId] = useState<Record<string, BulkProductDraft>>({});
  const [wizardStep, setWizardStep] = useState<WizardStepId>("scope");
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<BulkProfileFeedback | null>(null);

  const categories = useMemo(() => {
    return sortCategoryCodes(
      dedupeCategoryCodes(
        products
          .map((product) => product.categoryId.trim())
          .filter((nextCategoryId) => nextCategoryId.length > 0),
      ),
    );
  }, [products]);

  const scopedProducts = useMemo(() => {
    if (scopeType === "all") {
      return products;
    }

    if (scopeType === "category") {
      return products.filter((product) => product.categoryId === categoryId);
    }

    const selected = new Set(selectedProductIds);
    return products.filter((product) => selected.has(product.id));
  }, [products, scopeType, categoryId, selectedProductIds]);

  const hasValidScopeSelection = useMemo(() => {
    if (scopeType === "selection") {
      return selectedProductIds.length > 0;
    }

    if (scopeType === "category") {
      return categoryId.trim().length > 0;
    }

    return true;
  }, [scopeType, selectedProductIds, categoryId]);

  const shouldBlockByEmptyScope = hasValidScopeSelection && scopedProducts.length === 0;
  const step1Ready = hasValidScopeSelection && !shouldBlockByEmptyScope;

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

  const changedProductPlans = useMemo(() => {
    return scopedProducts
      .map((product) => {
        const draft = draftByProductId[product.id] ?? toDefaultDraft(product);
      const plan = buildDraftPlan({
        canAdjustStock,
        draft,
        formatCurrency,
        messages,
        product,
      });

        if (!plan.success) {
          return {
            product,
            success: false as const,
            error: plan.error,
          };
        }

        if (
          Object.keys(plan.plan.patch).length === 0 &&
          Math.abs(plan.plan.stockDelta) < 0.0001
        ) {
          return {
            product,
            success: true as const,
            plan: null,
          };
        }

        return {
          product,
          success: true as const,
          plan: plan.plan,
        };
      })
      .filter((entry) => entry.success === false || entry.plan !== null);
  }, [canAdjustStock, draftByProductId, formatCurrency, messages, scopedProducts]);

  const changedProductsCount = changedProductPlans.filter((entry) => entry.success).length;

  const firstInvalidPlan = changedProductPlans.find(
    (entry): entry is { readonly product: BulkProductItem; readonly success: false; readonly error: string } =>
      entry.success === false,
  );

  const scopedProductById = useMemo(
    () => new Map(scopedProducts.map((product) => [product.id, product])),
    [scopedProducts],
  );

  const reloadProducts = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      const { response, data } = await fetchJsonNoStore<ProductListResponse>(
        "/api/v1/products?activeOnly=false",
      );

      if (!response.ok || !data) {
        throw new Error(messages.productsWorkspace.bulkProfileUpdate.errors.loadProducts);
      }

      setProducts(data.items);
      setDraftByProductId((current) => {
        const next: Record<string, BulkProductDraft> = {};
        for (const product of data.items) {
          next[product.id] = current[product.id] ?? toDefaultDraft(product);
        }
        return next;
      });

      setSelectedProductIds((current) => {
        const known = new Set(data.items.map((item) => item.id));
        return current.filter((id) => known.has(id));
      });

      setCategoryId((current) => {
        const knownCategories = new Set(
          data.items
            .map((item) => item.categoryId.trim())
            .filter((nextCategoryId) => nextCategoryId.length > 0),
        );

        if (current.trim().length > 0 && knownCategories.has(current)) {
          return current;
        }

        return data.items.find((item) => item.categoryId.trim().length > 0)?.categoryId ?? "";
      });
    } catch {
      setFeedback({
        type: "error",
        message: messages.productsWorkspace.bulkProfileUpdate.errors.loadProducts,
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [messages.productsWorkspace.bulkProfileUpdate.errors.loadProducts]);

  useEffect(() => {
    void reloadProducts();
  }, [refreshToken, reloadProducts]);

  useEffect(() => {
    if (categories.length === 0) {
      if (categoryId !== "") {
        setCategoryId("");
      }
      return;
    }

    if (categoryId.trim().length === 0 || !categories.includes(categoryId)) {
      setCategoryId(categories[0] ?? "");
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const payload = {
      description: feedback.message,
      testId: "bulk-profile-feedback",
    };

    if (feedback.type === "error") {
      showErrorToast(payload);
      return;
    }

    showSuccessToast(payload);
  }, [feedback]);

  function canOpenStep(step: WizardStepId): boolean {
    if (step === "scope") {
      return true;
    }

    if (step === "edit") {
      return step1Ready;
    }

    return step1Ready && changedProductsCount > 0;
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

  function toggleProductSelection(productId: string): void {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      return [...current, productId];
    });
  }

  function updateDraft(productId: string, patch: Partial<BulkProductDraft>): void {
    setDraftByProductId((current) => {
      const base = scopedProductById.get(productId);
      const previous = current[productId] ?? (base ? toDefaultDraft(base) : undefined);
      if (!previous) {
        return current;
      }

      return {
        ...current,
        [productId]: {
          ...previous,
          ...patch,
        },
      };
    });
  }

  async function applyChanges(): Promise<void> {
    if (!step1Ready || shouldBlockByEmptyScope) {
      setFeedback({
        type: "error",
        message: messages.productsWorkspace.bulkProfileUpdate.errors.emptyScope,
      });
      return;
    }

    if (changedProductPlans.length === 0) {
      setFeedback({
        type: "error",
        message: messages.productsWorkspace.bulkProfileUpdate.errors.noChanges,
      });
      return;
    }

    if (firstInvalidPlan) {
      setWizardStep("edit");
      setFeedback({
        type: "error",
        message: `${firstInvalidPlan.product.name}: ${firstInvalidPlan.error}`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    let updatedProducts = 0;
    let adjustedStockProducts = 0;
    const failedProducts: string[] = [];

    for (const entry of changedProductPlans) {
      if (!entry.success || !entry.plan) {
        continue;
      }

      const product = entry.product;
      const { patch, stockDelta } = entry.plan;

      try {
        if (Object.keys(patch).length > 0) {
          const updateResponse = await fetch(`/api/v1/products/${product.id}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(patch),
          });

          const updatePayload = (await updateResponse.json()) as ApiErrorPayload;
          if (!updateResponse.ok) {
            throw new Error(
              resolveApiMessage(
                updatePayload,
                messages.productsWorkspace.bulkProfileUpdate.errors.updateProduct,
              ),
            );
          }

          updatedProducts += 1;
        }

        if (Math.abs(stockDelta) >= 0.0001) {
          const movementType = stockDelta > 0 ? "adjustment" : "outbound";
          const quantity = Math.abs(stockDelta);

          const stockResponse = await fetch("/api/v1/stock-movements", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              productId: product.id,
              movementType,
              quantity,
              reason: messages.productsWorkspace.bulkProfileUpdate.stockAdjustmentReason,
            }),
          });

          const stockPayload = (await stockResponse.json()) as ApiErrorPayload;
          if (!stockResponse.ok) {
            throw new Error(
              resolveApiMessage(
                stockPayload,
                messages.productsWorkspace.bulkProfileUpdate.errors.updateStock,
              ),
            );
          }

          adjustedStockProducts += 1;
        }
      } catch {
        failedProducts.push(product.name);
      }
    }

    setIsSubmitting(false);

    await reloadProducts();

    if (failedProducts.length > 0) {
      setFeedback({
        type: "error",
        message: messages.productsWorkspace.bulkProfileUpdate.feedback.partialError(
          failedProducts.length,
        ),
      });
      return;
    }

    setFeedback({
      type: "success",
      message: messages.productsWorkspace.bulkProfileUpdate.feedback.success(
        updatedProducts,
        adjustedStockProducts,
      ),
    });

    await onProfilesUpdated?.({
      updatedProducts,
      adjustedStockProducts,
      failedProducts: failedProducts.length,
    });
  }

  return (
    <article className="space-y-4">
      <header className="space-y-3">
        <p className="text-sm text-slate-500">
          {messages.productsWorkspace.bulkProfileUpdate.processHint}
        </p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          {messages.productsWorkspace.bulkProfileUpdate.eligibleProducts(scopedProducts.length)}
        </div>
      </header>

      {isLoadingProducts ? (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
          {messages.productsWorkspace.bulkProfileUpdate.loadingProducts}
        </p>
      ) : null}

      <Tabs value={wizardStep} onValueChange={onWizardStepChange}>
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 lg:grid-cols-3">
          {wizardStepOrder.map((step) => {
            const title =
              step === "scope"
                ? messages.productsWorkspace.bulkProfileUpdate.scopeStepTitle
                : step === "edit"
                  ? messages.productsWorkspace.bulkProfileUpdate.editStepTitle
                  : messages.productsWorkspace.bulkProfileUpdate.confirmStepTitle;
            const complete =
              step === "scope"
                ? step1Ready
                : step === "edit"
                  ? changedProductsCount > 0
                  : false;
            const isActive = wizardStep === step;

            return (
              <TabsTrigger
                key={step}
                value={step}
                data-testid={`bulk-profile-wizard-step-${step}`}
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
                {messages.productsWorkspace.bulkProfileUpdate.scopeStepTitle}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {messages.productsWorkspace.bulkProfileUpdate.scopeStepDescription}
              </p>
            </div>
            {scopeType === "selection" ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {messages.catalog.bulkPriceUpdate.wizard.selectedProducts(selectedProductIds.length)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">
                {messages.common.labels.scope}
              </span>
              <select
                data-testid="bulk-profile-scope-select"
                value={scopeType}
                onChange={(event) =>
                  setScopeType(event.target.value as "all" | "category" | "selection")
                }
                className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
              >
                <option value="all">{messages.catalog.bulkPriceUpdate.scopes.all}</option>
                <option value="category">{messages.catalog.bulkPriceUpdate.scopes.category}</option>
                <option value="selection">{messages.catalog.bulkPriceUpdate.scopes.selection}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">
                {messages.common.labels.category}
              </span>
              <select
                data-testid="bulk-profile-category-select"
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
              {messages.productsWorkspace.bulkProfileUpdate.errors.emptyScope}
            </p>
          ) : null}

          {scopeType === "selection" ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-3">
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
                        data-testid={`bulk-profile-selection-item-${product.id}`}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:border-blue-200"
                      >
                        <Checkbox
                          data-testid={`bulk-profile-selection-checkbox-${product.id}`}
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
                      data-testid="bulk-profile-selection-infinite-scroll-sentinel"
                      className="h-2 w-full"
                      aria-hidden
                    />
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                      <span data-testid="bulk-profile-selection-infinite-scroll-status">
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
              data-testid="bulk-profile-wizard-next-from-scope"
              type="button"
              onClick={() => setWizardStep("edit")}
              disabled={!step1Ready}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
            >
              {messages.catalog.bulkPriceUpdate.wizard.nextAction}
              <ChevronRight size={16} />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="edit" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {messages.productsWorkspace.bulkProfileUpdate.editStepTitle}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {messages.productsWorkspace.bulkProfileUpdate.editStepDescription}
            </p>
          </div>

          {!canAdjustStock ? (
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {messages.productsWorkspace.bulkProfileUpdate.stockPermissionHint}
            </p>
          ) : null}

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">
                {messages.productsWorkspace.bulkProfileUpdate.editListTitle}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {messages.productsWorkspace.bulkProfileUpdate.editListHint(scopedProducts.length)}
              </p>
            </div>
            <ul className="max-h-[26rem] space-y-3 overflow-y-auto p-3">
              {scopedProducts.map((product) => {
                const draft = draftByProductId[product.id] ?? toDefaultDraft(product);

                return (
                  <li
                    key={`bulk-profile-edit-${product.id}`}
                    data-testid={`bulk-profile-edit-item-${product.id}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500"
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
                        {product.imageUrl ? null : <Package size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[1rem] font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">
                          {labelForCategory(product.categoryId)} • {product.sku}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {messages.productsWorkspace.fields.name}
                        </span>
                        <input
                          data-testid={`bulk-profile-edit-name-input-${product.id}`}
                          type="text"
                          value={draft.name}
                          onChange={(event) => updateDraft(product.id, { name: event.target.value })}
                          className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {messages.productsWorkspace.fields.price}
                        </span>
                        <input
                          data-testid={`bulk-profile-edit-price-input-${product.id}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={draft.price}
                          onChange={(event) => updateDraft(product.id, { price: event.target.value })}
                          className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {messages.productsWorkspace.fields.cost}
                        </span>
                        <input
                          data-testid={`bulk-profile-edit-cost-input-${product.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.cost}
                          onChange={(event) => updateDraft(product.id, { cost: event.target.value })}
                          className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {messages.productsWorkspace.fields.minStock}
                        </span>
                        <input
                          data-testid={`bulk-profile-edit-min-stock-input-${product.id}`}
                          type="number"
                          min="0"
                          step="1"
                          value={draft.minStock}
                          onChange={(event) => updateDraft(product.id, { minStock: event.target.value })}
                          className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {messages.productsWorkspace.bulkProfileUpdate.targetStockLabel}
                        </span>
                        <input
                          data-testid={`bulk-profile-edit-target-stock-input-${product.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.targetStock}
                          onChange={(event) =>
                            updateDraft(product.id, { targetStock: event.target.value })
                          }
                          disabled={!canAdjustStock}
                          className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </label>

                      <label className="flex items-end pb-2">
                        <span className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                          <Checkbox
                            checked={draft.isActive}
                            onCheckedChange={(nextChecked) =>
                              updateDraft(product.id, { isActive: nextChecked === true })
                            }
                          />
                          {messages.productsWorkspace.bulkProfileUpdate.activeLabel}
                        </span>
                      </label>
                    </div>
                  </li>
                );
              })}
              {scopedProducts.length === 0 ? (
                <li className="text-sm text-slate-500">
                  {messages.productsWorkspace.bulkProfileUpdate.errors.emptyScope}
                </li>
              ) : null}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button
              data-testid="bulk-profile-wizard-back-to-scope"
              type="button"
              onClick={() => setWizardStep("scope")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              {messages.catalog.bulkPriceUpdate.wizard.backAction}
            </button>
            <button
              data-testid="bulk-profile-wizard-next-to-confirm"
              type="button"
              onClick={() => setWizardStep("confirm")}
              disabled={changedProductsCount === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
            >
              {messages.productsWorkspace.bulkProfileUpdate.reviewChangesAction}
              <ChevronRight size={16} />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="confirm" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {messages.productsWorkspace.bulkProfileUpdate.confirmStepTitle}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {messages.productsWorkspace.bulkProfileUpdate.confirmStepDescription}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {messages.productsWorkspace.bulkProfileUpdate.pendingChanges(changedProductsCount)}
          </div>

          {firstInvalidPlan ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {firstInvalidPlan.product.name}: {firstInvalidPlan.error}
            </p>
          ) : null}

          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
            {changedProductPlans.map((entry) => {
              if (!entry.success || !entry.plan) {
                return null;
              }

              return (
                <li
                  key={`bulk-profile-confirm-${entry.product.id}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500"
                      style={
                        entry.product.imageUrl
                          ? {
                              backgroundImage: `url(${entry.product.imageUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                      aria-hidden
                    >
                      {entry.product.imageUrl ? null : <Package size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {entry.product.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {entry.plan.changes.map((change, index) => (
                      <div
                        key={`${entry.product.id}-change-${index}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {change.label}
                        </span>
                        <p className="flex items-center gap-1.5 text-sm">
                          <span className="text-slate-400 line-through">{change.before}</span>
                          <ArrowRight size={14} className="text-slate-400" />
                          <span className="font-semibold text-emerald-700">{change.after}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
            {changedProductPlans.length === 0 ? (
              <li className="text-sm text-slate-500">
                {messages.productsWorkspace.bulkProfileUpdate.errors.noChanges}
              </li>
            ) : null}
          </ul>

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button
              data-testid="bulk-profile-wizard-back-to-edit"
              type="button"
              onClick={() => setWizardStep("edit")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              {messages.catalog.bulkPriceUpdate.wizard.backAction}
            </button>
            <button
              data-testid="bulk-profile-apply-button"
              type="button"
              onClick={() => {
                void applyChanges();
              }}
              disabled={isSubmitting || changedProductsCount === 0 || Boolean(firstInvalidPlan)}
              className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
            >
              {isSubmitting
                ? messages.common.states.applying
                : messages.productsWorkspace.bulkProfileUpdate.applyAction}
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </article>
  );
}

function buildDraftPlan(input: {
  readonly product: BulkProductItem;
  readonly draft: BulkProductDraft;
  readonly canAdjustStock: boolean;
  readonly formatCurrency: (value: number) => string;
  readonly messages: ReturnType<typeof useI18n>["messages"];
}):
  | { readonly success: true; readonly plan: DraftPlan }
  | { readonly success: false; readonly error: string } {
  const { canAdjustStock, draft, formatCurrency, messages, product } = input;

  const patch: Record<string, unknown> = {};
  const changes: DraftPlanChange[] = [];

  const nextName = draft.name.trim();
  if (nextName.length < 2) {
    return {
      success: false,
      error: messages.productsWorkspace.bulkProfileUpdate.errors.invalidName,
    };
  }

  if (nextName !== product.name) {
    patch.name = nextName;
    changes.push({
      label: messages.productsWorkspace.fields.name,
      before: product.name,
      after: nextName,
    });
  }

  const nextPrice = Number(draft.price);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    return {
      success: false,
      error: messages.productsWorkspace.bulkProfileUpdate.errors.invalidPrice,
    };
  }

  if (Math.abs(nextPrice - product.price) >= 0.0001) {
    patch.price = nextPrice;
    changes.push({
      label: messages.productsWorkspace.fields.price,
      before: formatCurrency(product.price),
      after: formatCurrency(nextPrice),
    });
  }

  const nextMinStock = Number(draft.minStock);
  if (!Number.isInteger(nextMinStock) || nextMinStock < 0) {
    return {
      success: false,
      error: messages.productsWorkspace.bulkProfileUpdate.errors.invalidMinStock,
    };
  }

  if (nextMinStock !== product.minStock) {
    patch.minStock = nextMinStock;
    changes.push({
      label: messages.productsWorkspace.fields.minStock,
      before: String(product.minStock),
      after: String(nextMinStock),
    });
  }

  const nextCostRaw = draft.cost.trim();
  if (nextCostRaw.length > 0) {
    const nextCost = Number(nextCostRaw);
    if (!Number.isFinite(nextCost) || nextCost <= 0) {
      return {
        success: false,
        error: messages.productsWorkspace.bulkProfileUpdate.errors.invalidCost,
      };
    }

    if (product.cost === undefined || Math.abs(nextCost - product.cost) >= 0.0001) {
      patch.cost = nextCost;
      changes.push({
        label: messages.productsWorkspace.fields.cost,
        before:
          product.cost === undefined
            ? messages.productsWorkspace.bulkProfileUpdate.noValue
            : formatCurrency(product.cost),
        after: formatCurrency(nextCost),
      });
    }
  }

  if (draft.isActive !== product.isActive) {
    patch.isActive = draft.isActive;
    changes.push({
      label: messages.productsWorkspace.bulkProfileUpdate.activeLabel,
      before: messages.productsWorkspace.bulkProfileUpdate.activeState(product.isActive),
      after: messages.productsWorkspace.bulkProfileUpdate.activeState(draft.isActive),
    });
  }

  const nextTargetStock = Number(draft.targetStock);
  if (!Number.isFinite(nextTargetStock) || nextTargetStock < 0) {
    return {
      success: false,
      error: messages.productsWorkspace.bulkProfileUpdate.errors.invalidStock,
    };
  }

  const stockDelta = Number((nextTargetStock - product.stock).toFixed(4));
  if (Math.abs(stockDelta) >= 0.0001 && !canAdjustStock) {
    return {
      success: false,
      error: messages.productsWorkspace.bulkProfileUpdate.errors.stockPermission,
    };
  }

  if (Math.abs(stockDelta) >= 0.0001) {
    changes.push({
      label: messages.productsWorkspace.bulkProfileUpdate.targetStockLabel,
      before: formatStockQuantity(product.stock),
      after: formatStockQuantity(nextTargetStock),
    });
  }

  return {
    success: true,
    plan: {
      patch,
      stockDelta,
      changes,
    },
  };
}

function formatStockQuantity(value: number): string {
  return Number(value.toFixed(4)).toString();
}
