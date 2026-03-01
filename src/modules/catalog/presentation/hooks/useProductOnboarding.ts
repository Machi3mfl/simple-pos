"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { fetchJsonNoStore } from "@/lib/http/fetchJsonNoStore";

export interface ProductOnboardingProduct {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

interface ProductListResponse {
  readonly items: readonly ProductOnboardingProduct[];
}

interface ProductResponse {
  readonly item: ProductOnboardingProduct;
}

interface ApiErrorPayload {
  readonly message?: string;
}

export interface ProductOnboardingFeedbackState {
  readonly type: "success" | "error";
  readonly message: string;
}

export interface ProductOnboardingFormState {
  readonly name: string;
  readonly sku: string;
  readonly categoryId: string;
  readonly price: string;
  readonly cost: string;
  readonly initialStock: string;
  readonly minStock: string;
  readonly imageUrl: string;
}

interface UseProductOnboardingOptions {
  readonly onProductCreated?: (product: ProductOnboardingProduct) => Promise<void> | void;
  readonly refreshToken?: number;
}

interface UseProductOnboardingResult {
  readonly categories: readonly string[];
  readonly feedback: ProductOnboardingFeedbackState | null;
  readonly form: ProductOnboardingFormState;
  readonly isLoadingProducts: boolean;
  readonly isSubmitting: boolean;
  readonly products: readonly ProductOnboardingProduct[];
  readonly reloadProducts: () => Promise<void>;
  readonly resetForm: () => void;
  readonly setForm: Dispatch<SetStateAction<ProductOnboardingFormState>>;
  readonly submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

const defaultCategoryOptions = ["main", "drink", "snack", "dessert", "other"];

function buildDefaultFormState(): ProductOnboardingFormState {
  return {
    name: "",
    sku: "",
    categoryId: "main",
    price: "10",
    cost: "",
    initialStock: "0",
    minStock: "0",
    imageUrl: "",
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

export function useProductOnboarding({
  onProductCreated,
  refreshToken,
}: UseProductOnboardingOptions): UseProductOnboardingResult {
  const { messages } = useI18n();
  const [form, setForm] = useState<ProductOnboardingFormState>(buildDefaultFormState);
  const [products, setProducts] = useState<readonly ProductOnboardingProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<ProductOnboardingFeedbackState | null>(null);

  const categories = useMemo(() => {
    const categorySet = new Set<string>(defaultCategoryOptions);
    for (const product of products) {
      categorySet.add(product.categoryId);
    }
    return Array.from(categorySet.values());
  }, [products]);

  const reloadProducts = useCallback(async (): Promise<void> => {
    setIsLoadingProducts(true);
    try {
      const { response, data } = await fetchJsonNoStore<ProductListResponse>("/api/v1/products");
      if (!response.ok || !data) {
        setFeedback({
          type: "error",
          message: messages.catalog.onboarding.loadError,
        });
        return;
      }

      setProducts(data.items);
    } catch {
      setFeedback({
        type: "error",
        message: messages.catalog.onboarding.loadError,
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [messages.catalog.onboarding.loadError]);

  function resetForm(): void {
    setForm(buildDefaultFormState());
    setFeedback(null);
  }

  useEffect(() => {
    void reloadProducts();
  }, [refreshToken, reloadProducts]);

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    if (!categories.includes(form.categoryId)) {
      setForm((current) => ({ ...current, categoryId: categories[0] ?? "main" }));
    }
  }, [categories, form.categoryId]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.initialStock);
    const parsedCost = form.cost.trim().length > 0 ? Number(form.cost) : undefined;
    const parsedMinStock = Number(form.minStock);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setFeedback({
        type: "error",
        message: messages.catalog.onboarding.invalidPrice,
      });
      return;
    }

    if (!Number.isFinite(parsedStock) || !Number.isInteger(parsedStock) || parsedStock < 0) {
      setFeedback({
        type: "error",
        message: messages.catalog.onboarding.invalidInitialStock,
      });
      return;
    }

    if (!Number.isFinite(parsedMinStock) || !Number.isInteger(parsedMinStock) || parsedMinStock < 0) {
      setFeedback({
        type: "error",
        message: messages.catalog.onboarding.invalidMinStock,
      });
      return;
    }

    if (parsedCost !== undefined && (!Number.isFinite(parsedCost) || parsedCost <= 0)) {
      setFeedback({
        type: "error",
        message: messages.catalog.onboarding.invalidCost,
      });
      return;
    }

    if (parsedStock > 0 && parsedCost === undefined) {
      setFeedback({
        type: "error",
        message: messages.catalog.onboarding.costRequiredForInitialStock,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sku: form.sku.trim() || undefined,
          name: form.name.trim(),
          categoryId: form.categoryId.trim(),
          price: parsedPrice,
          cost: parsedCost,
          initialStock: parsedStock,
          minStock: parsedMinStock,
          imageUrl: form.imageUrl.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as ProductResponse | ApiErrorPayload;
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: resolveApiMessage(payload, messages.catalog.onboarding.createError),
        });
        return;
      }

      const createdProduct = (payload as ProductResponse).item;
      setFeedback({
        type: "success",
        message: messages.catalog.onboarding.createSuccess(createdProduct.name),
      });
      setForm(buildDefaultFormState());
      await reloadProducts();
      await onProductCreated?.(createdProduct);
    } catch {
      setFeedback({
        type: "error",
        message: messages.catalog.onboarding.createError,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    categories,
    feedback,
    form,
    isLoadingProducts,
    isSubmitting,
    products,
    reloadProducts,
    resetForm,
    setForm,
    submit,
  };
}
