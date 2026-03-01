"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

export interface BulkPriceProductItem {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
}

interface ProductListResponse {
  readonly items: readonly BulkPriceProductItem[];
}

export interface BulkPriceUpdateResultItem {
  readonly productId: string;
  readonly oldPrice: number;
  readonly newPrice: number;
}

export interface BulkPriceUpdateInvalidItem {
  readonly productId: string;
  readonly reason: string;
}

export interface BulkPriceUpdateResponse {
  readonly batchId: string;
  readonly updatedCount: number;
  readonly items: readonly BulkPriceUpdateResultItem[];
  readonly appliedAt: string;
  readonly previewOnly: boolean;
  readonly appliedBy: string;
  readonly invalidItems: readonly BulkPriceUpdateInvalidItem[];
}

interface ApiErrorPayload {
  readonly message?: string;
}

type ScopeType = "all" | "category" | "selection";
type ModeType = "percentage" | "fixed_amount";

interface BulkPriceUpdateFeedback {
  readonly type: "success" | "error";
  readonly message: string;
}

interface UseBulkPriceUpdateOptions {
  readonly onPricesUpdated?: (result: BulkPriceUpdateResponse) => Promise<void> | void;
  readonly refreshToken?: number;
}

interface UseBulkPriceUpdateResult {
  readonly canApplyCurrentPreview: boolean;
  readonly categories: readonly string[];
  readonly categoryId: string;
  readonly feedback: BulkPriceUpdateFeedback | null;
  readonly hasValidScopeSelection: boolean;
  readonly isLoadingProducts: boolean;
  readonly isSubmitting: boolean;
  readonly lastResult: BulkPriceUpdateResponse | null;
  readonly mode: ModeType;
  readonly products: readonly BulkPriceProductItem[];
  readonly productNameById: ReadonlyMap<string, string>;
  readonly reloadProducts: () => Promise<void>;
  readonly resetState: () => void;
  readonly scopedProducts: readonly BulkPriceProductItem[];
  readonly scopeType: ScopeType;
  readonly selectedProductIds: readonly string[];
  readonly setCategoryId: Dispatch<SetStateAction<string>>;
  readonly setMode: Dispatch<SetStateAction<ModeType>>;
  readonly setScopeType: Dispatch<SetStateAction<ScopeType>>;
  readonly setValue: Dispatch<SetStateAction<string>>;
  readonly shouldBlockByEmptyScope: boolean;
  readonly toggleProductSelection: (productId: string) => void;
  readonly value: string;
  readonly preview: () => Promise<void>;
  readonly apply: () => Promise<void>;
}

const defaultCategoryOptions = ["main", "drink", "snack", "dessert", "other"];

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

export function useBulkPriceUpdate({
  onPricesUpdated,
  refreshToken,
}: UseBulkPriceUpdateOptions): UseBulkPriceUpdateResult {
  const { messages } = useI18n();
  const [products, setProducts] = useState<readonly BulkPriceProductItem[]>([]);
  const [scopeType, setScopeType] = useState<ScopeType>("category");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<readonly string[]>([]);
  const [mode, setMode] = useState<ModeType>("percentage");
  const [value, setValue] = useState<string>("10");
  const [lastResult, setLastResult] = useState<BulkPriceUpdateResponse | null>(null);
  const [feedback, setFeedback] = useState<BulkPriceUpdateFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);

  const productNameById = useMemo(
    () => new Map<string, string>(products.map((product) => [product.id, product.name])),
    [products],
  );

  const categories = useMemo(() => {
    const set = new Set<string>(defaultCategoryOptions);
    for (const product of products) {
      set.add(product.categoryId);
    }
    return Array.from(set.values());
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

  const currentSignature = useMemo(() => {
    const selectionIds = [...selectedProductIds].sort();
    return JSON.stringify({
      scopeType,
      categoryId,
      selectionIds,
      mode,
      value: value.trim(),
    });
  }, [categoryId, mode, scopeType, selectedProductIds, value]);

  const canApplyCurrentPreview =
    previewSignature === currentSignature &&
    lastResult?.previewOnly === true &&
    lastResult.invalidItems.length === 0;

  const reloadProducts = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      const { response, data } = await fetchJsonNoStore<ProductListResponse>(
        "/api/v1/products?activeOnly=true",
      );

      if (!response.ok || !data) {
        throw new Error(messages.catalog.bulkPriceUpdate.requestError);
      }

      setProducts(data.items);
      setCategoryId((current) => {
        const normalizedCurrent = current.trim();
        const knownCategories = new Set<string>([
          ...defaultCategoryOptions,
          ...data.items.map((item) => item.categoryId),
        ]);

        if (normalizedCurrent.length > 0 && knownCategories.has(normalizedCurrent)) {
          return current;
        }

        return data.items[0]?.categoryId ?? defaultCategoryOptions[0] ?? "other";
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [messages.catalog.bulkPriceUpdate.requestError]);

  function resetState(): void {
    setScopeType("category");
    setCategoryId("");
    setSelectedProductIds([]);
    setMode("percentage");
    setValue("10");
    setLastResult(null);
    setFeedback(null);
    setPreviewSignature(null);
  }

  useEffect(() => {
    void reloadProducts();
  }, [refreshToken, reloadProducts]);

  useEffect(() => {
    if (categories.length > 0 && (categoryId.trim().length === 0 || !categories.includes(categoryId))) {
      setCategoryId(categories[0] ?? "other");
    }
  }, [categories, categoryId]);

  function toggleProductSelection(productId: string): void {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      return [...current, productId];
    });
  }

  function buildScope():
    | { readonly type: "all" }
    | { readonly type: "category"; readonly categoryId: string }
    | { readonly type: "selection"; readonly productIds: readonly string[] } {
    if (scopeType === "all") {
      return { type: "all" };
    }

    if (scopeType === "category") {
      return {
        type: "category",
        categoryId,
      };
    }

    return {
      type: "selection",
      productIds: [...selectedProductIds],
    };
  }

  async function executeRequest(previewOnly: boolean): Promise<void> {
    setFeedback(null);
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
      setFeedback({
        type: "error",
        message: messages.catalog.bulkPriceUpdate.invalidValue,
      });
      return;
    }

    if (scopeType === "category" && !categoryId) {
      setFeedback({
        type: "error",
        message: messages.catalog.bulkPriceUpdate.missingCategory,
      });
      return;
    }

    if (scopeType === "selection" && selectedProductIds.length === 0) {
      setFeedback({
        type: "error",
        message: messages.catalog.bulkPriceUpdate.missingSelection,
      });
      return;
    }

    if (shouldBlockByEmptyScope) {
      setFeedback({
        type: "error",
        message: messages.catalog.bulkPriceUpdate.emptyScopeSelection,
      });
      return;
    }

    if (!previewOnly && previewSignature !== currentSignature) {
      setFeedback({
        type: "error",
        message: messages.catalog.bulkPriceUpdate.previewRequiredBeforeApply,
      });
      return;
    }

    if (!previewOnly && lastResult?.invalidItems.length) {
      setFeedback({
        type: "error",
        message: messages.catalog.bulkPriceUpdate.previewHasErrors,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/products/price-batches", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-actor-id": "ui-admin",
        },
        body: JSON.stringify({
          scope: buildScope(),
          mode,
          value: parsedValue,
          previewOnly,
        }),
      });

      const payload = (await response.json()) as BulkPriceUpdateResponse | ApiErrorPayload;

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.catalog.bulkPriceUpdate.requestError),
        });
        setLastResult(null);
        if (previewOnly) {
          setPreviewSignature(null);
        }
        return;
      }

      const result = payload as BulkPriceUpdateResponse;
      setLastResult(result);
      setFeedback({
        type: "success",
        message: previewOnly
          ? messages.catalog.bulkPriceUpdate.previewReady(result.items.length)
          : messages.catalog.bulkPriceUpdate.applied(result.updatedCount),
      });

      if (previewOnly) {
        setPreviewSignature(currentSignature);
        return;
      }

      setPreviewSignature(null);
      await reloadProducts();
      await onPricesUpdated?.(result);
    } catch {
      setFeedback({
        type: "error",
        message: messages.catalog.bulkPriceUpdate.requestError,
      });
      setLastResult(null);
      if (previewOnly) {
        setPreviewSignature(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    canApplyCurrentPreview,
    categories,
    categoryId,
    feedback,
    hasValidScopeSelection,
    isLoadingProducts,
    isSubmitting,
    lastResult,
    mode,
    productNameById,
    products,
    reloadProducts,
    resetState,
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
    apply: async () => executeRequest(false),
    preview: async () => executeRequest(true),
  };
}
