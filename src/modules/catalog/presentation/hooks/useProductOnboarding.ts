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
import { DEFAULT_PRODUCT_MIN_STOCK } from "@/modules/catalog/domain/constants/ProductDefaults";
import { buildProductMutationFormData } from "@/modules/catalog/presentation/handlers/buildProductMutationFormData";
import {
  dedupeCategoryCodes,
  defaultKioskCategoryCodes,
  sortCategoryCodes,
} from "@/shared/core/category/categoryNaming";

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

export interface ProductOnboardingFieldErrors {
  name?: string;
  categoryId?: string;
  price?: string;
  cost?: string;
  initialStock?: string;
  minStock?: string;
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
  readonly imageFile: File | null;
}

interface UseProductOnboardingOptions {
  readonly onProductCreated?: (product: ProductOnboardingProduct) => Promise<void> | void;
  readonly refreshToken?: number;
}

interface UseProductOnboardingResult {
  readonly categories: readonly string[];
  readonly fieldErrors: ProductOnboardingFieldErrors;
  readonly feedback: ProductOnboardingFeedbackState | null;
  readonly form: ProductOnboardingFormState;
  readonly isLoadingProducts: boolean;
  readonly isSubmitting: boolean;
  readonly products: readonly ProductOnboardingProduct[];
  readonly reloadProducts: () => Promise<void>;
  readonly resetForm: () => void;
  readonly setForm: Dispatch<SetStateAction<ProductOnboardingFormState>>;
  readonly shouldShowFieldErrors: boolean;
  readonly submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

const defaultCategoryOptions = defaultKioskCategoryCodes();

function buildDefaultFormState(): ProductOnboardingFormState {
  return {
    name: "",
    sku: "",
    categoryId: defaultCategoryOptions[0] ?? "other",
    price: "10",
    cost: "",
    initialStock: "0",
    minStock: String(DEFAULT_PRODUCT_MIN_STOCK),
    imageUrl: "",
    imageFile: null,
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

function resolveProductOnboardingFieldErrors(
  form: ProductOnboardingFormState,
  messages: ReturnType<typeof useI18n>["messages"],
): ProductOnboardingFieldErrors {
  const parsedPrice = Number(form.price);
  const parsedStock = Number(form.initialStock);
  const parsedCost = form.cost.trim().length > 0 ? Number(form.cost) : undefined;
  const parsedMinStock = Number(form.minStock);
  const errors: ProductOnboardingFieldErrors = {};

  if (form.name.trim().length < 2) {
    errors.name = messages.catalog.onboarding.invalidName;
  }

  if (form.categoryId.trim().length === 0) {
    errors.categoryId = messages.catalog.onboarding.invalidCategory;
  }

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    errors.price = messages.catalog.onboarding.invalidPrice;
  }

  if (!Number.isFinite(parsedStock) || !Number.isInteger(parsedStock) || parsedStock < 0) {
    errors.initialStock = messages.catalog.onboarding.invalidInitialStock;
  }

  if (!Number.isFinite(parsedMinStock) || !Number.isInteger(parsedMinStock) || parsedMinStock < 0) {
    errors.minStock = messages.catalog.onboarding.invalidMinStock;
  }

  if (parsedCost !== undefined && (!Number.isFinite(parsedCost) || parsedCost <= 0)) {
    errors.cost = messages.catalog.onboarding.invalidCost;
  }

  if (parsedStock > 0 && parsedCost === undefined) {
    errors.cost = messages.catalog.onboarding.costRequiredForInitialStock;
  }

  return errors;
}

function resolveFirstFieldError(
  fieldErrors: ProductOnboardingFieldErrors,
): string | undefined {
  return (
    fieldErrors.name ??
    fieldErrors.categoryId ??
    fieldErrors.price ??
    fieldErrors.initialStock ??
    fieldErrors.minStock ??
    fieldErrors.cost
  );
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
  const [shouldShowFieldErrors, setShouldShowFieldErrors] = useState<boolean>(false);

  const categories = useMemo(() => {
    return sortCategoryCodes(dedupeCategoryCodes([
      ...defaultCategoryOptions,
      ...products.map((product) => product.categoryId),
    ]));
  }, [products]);
  const fieldErrors = useMemo(
    () => resolveProductOnboardingFieldErrors(form, messages),
    [form, messages],
  );

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
    setShouldShowFieldErrors(false);
  }

  useEffect(() => {
    void reloadProducts();
  }, [refreshToken, reloadProducts]);

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    if (form.categoryId.trim().length === 0) {
      setForm((current) => ({ ...current, categoryId: categories[0] ?? defaultCategoryOptions[0] ?? "other" }));
    }
  }, [categories, form.categoryId]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);
    setShouldShowFieldErrors(true);

    const firstFieldError = resolveFirstFieldError(fieldErrors);
    if (firstFieldError) {
      setFeedback({
        type: "error",
        message: firstFieldError,
      });
      return;
    }

    const parsedPrice = Number(form.price);
    const parsedStock = Number(form.initialStock);
    const parsedCost = form.cost.trim().length > 0 ? Number(form.cost) : undefined;
    const parsedMinStock = Number(form.minStock);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/products", {
        method: "POST",
        body: buildProductMutationFormData(
          {
            sku: form.sku,
            name: form.name,
            categoryId: form.categoryId,
            price: parsedPrice,
            cost: parsedCost,
            initialStock: parsedStock,
            minStock: parsedMinStock,
          },
          {
            imageUrl: form.imageUrl,
            imageFile: form.imageFile,
          },
        ),
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
      setShouldShowFieldErrors(false);
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
    fieldErrors,
    feedback,
    form,
    isLoadingProducts,
    isSubmitting,
    products,
    reloadProducts,
    resetForm,
    setForm,
    shouldShowFieldErrors,
    submit,
  };
}
