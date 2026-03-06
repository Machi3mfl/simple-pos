"use client";

import {
  ArrowLeft,
  CheckSquare,
  ChevronRight,
  History,
  Loader2,
  MoreHorizontal,
  Package,
  Shapes,
  Save,
  Search,
  Store,
  Trash2,
  XSquare,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { FloatingModalCloseButton } from "@/components/ui/floating-modal-close-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastAction } from "@/components/ui/toast";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/hooks/use-app-toast";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { getFormControlValidationProps } from "@/lib/form-controls";
import { CategoryInputField } from "@/modules/catalog/presentation/components/CategoryInputField";
import { DEFAULT_PRODUCT_MIN_STOCK } from "@/modules/catalog/domain/constants/ProductDefaults";
import {
  dedupeCategoryCodes,
  defaultKioskCategoryCodes,
  normalizeCategoryCode,
  sortCategoryCodes,
} from "@/shared/core/category/categoryNaming";
import { ProductDisplayCard } from "@/shared/presentation/components/ProductDisplayCard";
import { useInfiniteScrollTrigger } from "@/shared/presentation/hooks/useInfiniteScrollTrigger";

import { resolveImportedProductSku } from "../../domain/services/ResolveImportedProductSku";
import {
  clearProductSourcingSessionSnapshot,
  readProductSourcingSessionSnapshot,
  writeProductSourcingSessionSnapshot,
} from "../session/productSourcingSessionStorage";
import {
  markProductSourcingFailedQueueEntriesResolved,
  markProductSourcingFailedQueueEntryDismissed,
  readProductSourcingFailedQueueEntries,
  updateProductSourcingFailedQueueDraft,
  upsertProductSourcingFailedQueueEntries,
  type ProductSourcingFailedQueueEntry,
  type ProductSourcingFailedQueueStatus,
} from "../session/productSourcingFailedQueue";

interface ApiErrorPayload {
  readonly code?: string;
  readonly message?: string;
  readonly details?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
}

interface ExternalCatalogCandidateItem {
  readonly providerId: "carrefour";
  readonly sourceProductId: string;
  readonly name: string;
  readonly brand: string | null;
  readonly ean: string | null;
  readonly categoryTrail: readonly string[];
  readonly suggestedCategoryId: string | null;
  readonly imageUrl: string | null;
  readonly referencePrice: number | null;
  readonly referenceListPrice: number | null;
  readonly productUrl: string | null;
}

interface ProductSourcingSearchResponse {
  readonly providerId: "carrefour";
  readonly items: readonly ExternalCatalogCandidateItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

interface ImportedCatalogProductItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

interface ProductSourcingImportResponse {
  readonly importedCount: number;
  readonly items: readonly {
    readonly row: number;
    readonly providerId: "carrefour";
    readonly sourceProductId: string;
    readonly item: ImportedCatalogProductItem;
  }[];
  readonly invalidItems: readonly {
    readonly row: number;
    readonly sourceProductId: string;
    readonly name?: string;
    readonly code:
      | "duplicate_in_batch"
      | "already_imported"
      | "missing_image"
      | "invalid_image_source"
      | "unsupported_image_content_type"
      | "image_too_large"
      | "duplicate_imported_sku"
      | "unexpected_error";
    readonly retryable: boolean;
    readonly reason: string;
  }[];
}

interface ExternalCategoryMappingItem {
  readonly id: string;
  readonly providerId: "carrefour";
  readonly externalCategoryPath: string;
  readonly internalCategoryId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ProductSourcingCategoryMappingsResponse {
  readonly items: readonly ExternalCategoryMappingItem[];
}

interface ImportedProductHistoryItem {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly productSku: string;
  readonly providerId: "carrefour";
  readonly sourceProductId: string;
  readonly storedImagePublicUrl: string;
  readonly brand: string | null;
  readonly ean: string | null;
  readonly mappedCategoryId: string;
  readonly importedAt: string;
}

interface ProductSourcingImportHistoryResponse {
  readonly items: readonly ImportedProductHistoryItem[];
}

interface KnownProductsResponse {
  readonly items: readonly {
    readonly categoryId: string;
  }[];
}

interface ImportDraft {
  readonly name: string;
  readonly categoryId: string;
  readonly price: string;
  readonly initialStock: string;
  readonly cost: string;
  readonly minStock: string;
}

interface FeedbackState {
  readonly type: "success" | "error";
  readonly message: string;
}

interface ImportActionOptions {
  readonly sourceProductIds?: readonly string[];
  readonly skipStocklessConfirmation?: boolean;
}

interface ImportDraftFieldErrors {
  name?: string;
  categoryId?: string;
  price?: string;
  initialStock?: string;
  cost?: string;
  minStock?: string;
}

interface ImportDraftFieldWarnings {
  initialStock?: string;
  cost?: string;
}

type FailedQueueFilter =
  | "open"
  | "retryable"
  | "non_recoverable"
  | "dismissed"
  | "resolved"
  | "all";
type WizardStepId = "search" | "details" | "confirm";

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 500;
const SEARCH_PAGE_SIZE = 8;
const CATEGORY_OPTIONS = defaultKioskCategoryCodes();
const WIZARD_STEP_ORDER: readonly WizardStepId[] = ["search", "details", "confirm"];
const FAILED_QUEUE_FILTERS = [
  "open",
  "retryable",
  "non_recoverable",
  "dismissed",
  "resolved",
  "all",
] as const satisfies readonly FailedQueueFilter[];

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof (payload as ApiErrorPayload).message === "string"
  ) {
    return (payload as ApiErrorPayload).message ?? fallback;
  }

  return fallback;
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function createImportDraft(item: ExternalCatalogCandidateItem): ImportDraft {
  return {
    name: item.name,
    categoryId: item.suggestedCategoryId ?? "other",
    price: item.referencePrice !== null ? String(item.referencePrice) : "",
    initialStock: "0",
    cost: "",
    minStock: String(DEFAULT_PRODUCT_MIN_STOCK),
  };
}

function parseRequiredDecimal(value: string): number | null {
  const normalized = value.trim().replace(/,/g, ".");
  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDecimal(value: string): number | undefined {
  const normalized = value.trim().replace(/,/g, ".");
  if (normalized.length === 0) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIntegerInput(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : null;
}

function hasZeroInitialStockWarning(draft: ImportDraft): boolean {
  const initialStock = parseIntegerInput(draft.initialStock);

  return initialStock === 0;
}

function hasMissingCostWithZeroStock(draft: ImportDraft): boolean {
  if (!hasZeroInitialStockWarning(draft)) {
    return false;
  }

  return draft.cost.trim().length === 0;
}

function buildZeroStockConfirmationSummary(
  items: readonly ExternalCatalogCandidateItem[],
  resolveDraft: (item: ExternalCatalogCandidateItem) => ImportDraft,
): {
  readonly signature: string;
  readonly zeroStockCount: number;
  readonly zeroStockWithoutCostCount: number;
} {
  const signatureParts: string[] = [];
  let zeroStockCount = 0;
  let zeroStockWithoutCostCount = 0;

  for (const item of items) {
    const draft = resolveDraft(item);
    if (!hasZeroInitialStockWarning(draft)) {
      continue;
    }

    zeroStockCount += 1;
    if (hasMissingCostWithZeroStock(draft)) {
      zeroStockWithoutCostCount += 1;
    }
    signatureParts.push(`${item.sourceProductId}:${draft.initialStock.trim()}:${draft.cost.trim()}`);
  }

  return {
    signature: signatureParts.sort().join("|"),
    zeroStockCount,
    zeroStockWithoutCostCount,
  };
}

function resolveImportDraftFieldErrors(
  draft: ImportDraft,
  sourceName: string,
): ImportDraftFieldErrors {
  const fieldErrors: ImportDraftFieldErrors = {};
  const normalizedName = draft.name.trim();
  const normalizedCategoryId = draft.categoryId.trim();
  const price = parseRequiredDecimal(draft.price);
  const initialStock = parseIntegerInput(draft.initialStock);
  const minStock = parseIntegerInput(draft.minStock);
  const cost = parseOptionalDecimal(draft.cost);
  const hasCostInput = draft.cost.trim().length > 0;

  if (normalizedName.length < 2) {
    fieldErrors.name = `Completa un nombre valido para ${sourceName}.`;
  }

  if (normalizedCategoryId.length === 0) {
    fieldErrors.categoryId = `Completa la categoria final para ${sourceName}.`;
  }

  if (price === null || price <= 0) {
    fieldErrors.price = `Ingresa un precio valido para ${sourceName}.`;
  }

  if (initialStock === null || initialStock < 0) {
    fieldErrors.initialStock = `Ingresa un stock inicial entero valido para ${sourceName}.`;
  }

  if (minStock === null || minStock < 0) {
    fieldErrors.minStock = `Ingresa un stock minimo entero valido para ${sourceName}.`;
  }

  if (hasCostInput && (cost === undefined || cost <= 0)) {
    fieldErrors.cost = `Ingresa un costo valido para ${sourceName}.`;
  }

  if (initialStock !== null && initialStock > 0 && (cost === undefined || cost <= 0)) {
    fieldErrors.cost = `Si cargas stock inicial para ${sourceName}, tambien debes informar el costo.`;
  }

  return fieldErrors;
}

function resolveImportDraftFieldWarnings(
  draft: ImportDraft,
  sourceName: string,
): ImportDraftFieldWarnings {
  const fieldWarnings: ImportDraftFieldWarnings = {};

  if (!hasZeroInitialStockWarning(draft)) {
    return fieldWarnings;
  }

  fieldWarnings.initialStock = `${sourceName} quedará con stock inicial en 0 si continúas.`;

  if (hasMissingCostWithZeroStock(draft)) {
    fieldWarnings.cost = `${sourceName} sigue sin costo cargado.`;
  }

  return fieldWarnings;
}

function hasImportDraftFieldWarnings(fieldWarnings: ImportDraftFieldWarnings): boolean {
  return Object.values(fieldWarnings).some((value) => typeof value === "string" && value.length > 0);
}

function resolveFirstImportDraftError(fieldErrors: ImportDraftFieldErrors): string | undefined {
  return (
    fieldErrors.name ??
    fieldErrors.categoryId ??
    fieldErrors.price ??
    fieldErrors.initialStock ??
    fieldErrors.cost ??
    fieldErrors.minStock
  );
}

function toTestIdFragment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanizeExternalCategoryPath(
  value: string,
  humanizeIdentifier: (value: string) => string,
): string {
  return value
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => humanizeIdentifier(segment))
    .join(" / ");
}

function invalidItemStatusLabel(
  invalidItem: ProductSourcingImportResponse["invalidItems"][number],
): string {
  return invalidItem.retryable ? "Pendiente de reintento" : "No recuperable";
}

function invalidItemTone(
  invalidItem: ProductSourcingImportResponse["invalidItems"][number],
): string {
  return invalidItem.retryable
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-rose-200 bg-rose-50 text-rose-800";
}

function failedQueueStatusLabel(status: ProductSourcingFailedQueueStatus): string {
  switch (status) {
    case "retryable":
      return "Recuperable";
    case "non_recoverable":
      return "No recuperable";
    case "dismissed":
      return "Descartado";
    case "resolved":
      return "Resuelto";
  }
}

function failedQueueStatusTone(status: ProductSourcingFailedQueueStatus): string {
  switch (status) {
    case "retryable":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "non_recoverable":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "dismissed":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "resolved":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
}

function failedQueueFilterLabel(filter: FailedQueueFilter): string {
  switch (filter) {
    case "open":
      return "Pendientes";
    case "retryable":
      return "Recuperables";
    case "non_recoverable":
      return "No recuperables";
    case "dismissed":
      return "Descartados";
    case "resolved":
      return "Resueltos";
    case "all":
      return "Todos";
  }
}

function matchesFailedQueueFilter(
  entry: ProductSourcingFailedQueueEntry,
  filter: FailedQueueFilter,
): boolean {
  switch (filter) {
    case "open":
      return entry.status === "retryable" || entry.status === "non_recoverable";
    case "all":
      return true;
    default:
      return entry.status === filter;
  }
}

function mergeSearchResults(
  currentItems: readonly ExternalCatalogCandidateItem[],
  incomingItems: readonly ExternalCatalogCandidateItem[],
): readonly ExternalCatalogCandidateItem[] {
  const seen = new Set<string>();
  const merged: ExternalCatalogCandidateItem[] = [];

  for (const item of [...currentItems, ...incomingItems]) {
    if (seen.has(item.sourceProductId)) {
      continue;
    }

    seen.add(item.sourceProductId);
    merged.push(item);
  }

  return merged;
}

function hasImportDraftFieldErrors(fieldErrors: ImportDraftFieldErrors): boolean {
  return Object.values(fieldErrors).some((value) => typeof value === "string" && value.length > 0);
}

function isWizardStepId(value: string): value is WizardStepId {
  return WIZARD_STEP_ORDER.includes(value as WizardStepId);
}

interface SourcingDialogProps {
  readonly title: string;
  readonly testId: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly maxWidthClassName?: string;
}

function SourcingDialog({
  title,
  testId,
  onClose,
  children,
  maxWidthClassName = "max-w-[1180px]",
}: SourcingDialogProps): JSX.Element {
  const { messages } = useI18n();

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-2 backdrop-blur-[2px] sm:p-3 md:p-5"
      data-testid={testId}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className={[
            "flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-[2rem] md:max-h-[calc(100dvh-2.5rem)]",
            maxWidthClassName,
          ].join(" ")}
        >
          <header className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5 md:px-7">
            <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900 sm:text-[1.65rem] md:text-[1.8rem]">
              {title}
            </h2>
          </header>
          <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 md:px-7 md:py-6">
            {children}
          </div>
        </div>
        <FloatingModalCloseButton
          onClick={onClose}
          ariaLabel={messages.common.actions.close}
          testId={`${testId}-close`}
        />
      </div>
    </div>
  );
}

export function ProductSourcingScreen({
  embedded = false,
}: {
  readonly embedded?: boolean;
}): JSX.Element {
  const { formatCurrency, formatDateTime, humanizeIdentifier, labelForCategory } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [results, setResults] = useState<readonly ExternalCatalogCandidateItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [importDrafts, setImportDrafts] = useState<Record<string, ImportDraft>>({});
  const [categoryMappings, setCategoryMappings] = useState<readonly ExternalCategoryMappingItem[]>([]);
  const [categoryMappingDrafts, setCategoryMappingDrafts] = useState<Record<string, string>>({});
  const [knownCategoryCodes, setKnownCategoryCodes] = useState<readonly string[]>(CATEGORY_OPTIONS);
  const [importHistory, setImportHistory] = useState<readonly ImportedProductHistoryItem[]>([]);
  const [failedQueueEntries, setFailedQueueEntries] = useState<
    readonly ProductSourcingFailedQueueEntry[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isLoadingMappings, setIsLoadingMappings] = useState<boolean>(false);
  const [, setIsLoadingKnownCategories] = useState<boolean>(false);
  const [isLoadingImportHistory, setIsLoadingImportHistory] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isSessionHydrated, setIsSessionHydrated] = useState<boolean>(false);
  const [activeMappingPath, setActiveMappingPath] = useState<string | null>(null);
  const [activeFailedQueueEntryId, setActiveFailedQueueEntryId] = useState<string | null>(null);
  const [failedQueueFilter, setFailedQueueFilter] = useState<FailedQueueFilter>("open");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<FeedbackState | null>(null);
  const [importHistoryFeedback, setImportHistoryFeedback] = useState<FeedbackState | null>(null);
  const [mappingFeedback, setMappingFeedback] = useState<FeedbackState | null>(null);
  const [failedQueueFeedback, setFailedQueueFeedback] = useState<FeedbackState | null>(null);
  const [importResult, setImportResult] = useState<ProductSourcingImportResponse | null>(null);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>("");
  const [searchPage, setSearchPage] = useState<number>(1);
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<WizardStepId>("search");
  const [isFailedQueueDialogOpen, setIsFailedQueueDialogOpen] = useState<boolean>(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState<boolean>(false);
  const [isMappingsDialogOpen, setIsMappingsDialogOpen] = useState<boolean>(false);
  const [isHeaderActionsOpen, setIsHeaderActionsOpen] = useState<boolean>(false);
  const [previewImageSourceProductId, setPreviewImageSourceProductId] = useState<string | null>(
    null,
  );
  const [confirmedZeroStockSignature, setConfirmedZeroStockSignature] = useState<string | null>(
    null,
  );
  const [hasAttemptedDetailsAdvance, setHasAttemptedDetailsAdvance] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldSkipNextAutoSearchRef = useRef<boolean>(false);
  const resultsRef = useRef<readonly ExternalCatalogCandidateItem[]>([]);
  const selectedIdsRef = useRef<readonly string[]>([]);
  const importDraftsRef = useRef<Record<string, ImportDraft>>({});
  const importConfirmationToastRef = useRef<ReturnType<typeof showInfoToast> | null>(null);
  const effectiveKnownCategoryCodes = useMemo(
    () =>
      dedupeCategoryCodes([
        ...knownCategoryCodes,
        ...categoryMappings.map((mapping) => mapping.internalCategoryId),
        ...importHistory.map((entry) => entry.mappedCategoryId),
      ]),
    [categoryMappings, importHistory, knownCategoryCodes],
  );
  const publishSourcingFeedback = useCallback(
    ({
      feedbackState,
      testId,
      fallbackTone = "info",
    }: {
      readonly feedbackState: FeedbackState | string;
      readonly testId: string;
      readonly fallbackTone?: "success" | "error" | "info";
    }): void => {
      const description =
        typeof feedbackState === "string" ? feedbackState : feedbackState.message;
      const tone =
        typeof feedbackState === "string" ? fallbackTone : feedbackState.type;
      const payload = {
        description,
        testId,
      };

      if (tone === "error") {
        showErrorToast(payload);
        return;
      }

      if (tone === "success") {
        showSuccessToast(payload);
        return;
      }

      showInfoToast(payload);
    },
    [],
  );

  useEffect(() => {
    if (!feedback) {
      return;
    }
    publishSourcingFeedback({
      feedbackState: feedback,
      testId: "product-sourcing-feedback",
      fallbackTone: "info",
    });
  }, [feedback, publishSourcingFeedback]);

  useEffect(() => {
    if (!sessionFeedback) {
      return;
    }
    publishSourcingFeedback({
      feedbackState: sessionFeedback,
      testId: "product-sourcing-session-feedback",
      fallbackTone: "info",
    });
  }, [publishSourcingFeedback, sessionFeedback]);

  useEffect(() => {
    if (!importFeedback) {
      return;
    }
    publishSourcingFeedback({
      feedbackState: importFeedback,
      testId: "product-sourcing-import-feedback",
    });
  }, [importFeedback, publishSourcingFeedback]);

  useEffect(() => {
    if (!failedQueueFeedback) {
      return;
    }
    publishSourcingFeedback({
      feedbackState: failedQueueFeedback,
      testId: "product-sourcing-failed-queue-feedback",
    });
  }, [failedQueueFeedback, publishSourcingFeedback]);

  useEffect(() => {
    if (!mappingFeedback) {
      return;
    }
    publishSourcingFeedback({
      feedbackState: mappingFeedback,
      testId: "product-sourcing-mapping-feedback",
    });
  }, [mappingFeedback, publishSourcingFeedback]);

  useEffect(() => {
    if (!importHistoryFeedback) {
      return;
    }
    publishSourcingFeedback({
      feedbackState: importHistoryFeedback,
      testId: "product-sourcing-import-history-feedback",
    });
  }, [importHistoryFeedback, publishSourcingFeedback]);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    importDraftsRef.current = importDrafts;
  }, [importDrafts]);

  useEffect(() => {
    const snapshot = readProductSourcingSessionSnapshot();
    setFailedQueueEntries(readProductSourcingFailedQueueEntries());

    if (snapshot) {
      const resultIds = new Set(snapshot.results.map((item) => item.sourceProductId));
      const restoredSelectedIds = snapshot.selectedIds.filter((sourceProductId) =>
        resultIds.has(sourceProductId),
      );
      const restoredDrafts = Object.fromEntries(
        Object.entries(snapshot.importDrafts).filter(([sourceProductId]) =>
          resultIds.has(sourceProductId),
        ),
      );

      shouldSkipNextAutoSearchRef.current = true;
      resultsRef.current = snapshot.results;
      setQuery(snapshot.query);
      setDebouncedQuery(snapshot.query);
      setResults(snapshot.results);
      setSelectedIds(restoredSelectedIds);
      setImportDrafts(restoredDrafts);
      setImportResult(snapshot.importResult);
      setSearchPerformed(snapshot.searchPerformed);
      setActiveSearchQuery(snapshot.activeSearchQuery);
      setSearchPage(snapshot.searchPage);
      setHasMoreResults(snapshot.hasMoreResults);
      setWizardStep(
        snapshot.importResult !== null
          ? "confirm"
          : restoredSelectedIds.length > 0
            ? "details"
            : "search",
      );
      setSessionFeedback("Se restauró la sesión anterior de sourcing.");
    }
    setIsSessionHydrated(true);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const loadCategoryMappings = useCallback(async (): Promise<void> => {
    setIsLoadingMappings(true);

    try {
      const response = await fetch("/api/v1/product-sourcing/category-mappings?limit=8", {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | ProductSourcingCategoryMappingsResponse
        | ApiErrorPayload
        | null;

      if (!response.ok) {
        setMappingFeedback({
          type: "error",
          message: resolveErrorMessage(payload, "No se pudo cargar el listado de category mappings."),
        });
        return;
      }

      const result = payload as ProductSourcingCategoryMappingsResponse;
      setCategoryMappings(result.items);
      setMappingFeedback(null);
      setCategoryMappingDrafts(
        Object.fromEntries(
          result.items.map((item) => [item.externalCategoryPath, item.internalCategoryId]),
        ),
      );
    } catch {
      setMappingFeedback({
        type: "error",
        message: "No se pudo cargar el listado de category mappings.",
      });
    } finally {
      setIsLoadingMappings(false);
    }
  }, []);

  const loadKnownCategories = useCallback(async (): Promise<void> => {
    setIsLoadingKnownCategories(true);

    try {
      const response = await fetch("/api/v1/products", {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | KnownProductsResponse
        | ApiErrorPayload
        | null;

      if (!response.ok) {
        return;
      }

      const result = payload as KnownProductsResponse;
      setKnownCategoryCodes(
        sortCategoryCodes(
          dedupeCategoryCodes([
            ...CATEGORY_OPTIONS,
            ...result.items.map((item) => item.categoryId),
          ]),
        ),
      );
    } finally {
      setIsLoadingKnownCategories(false);
    }
  }, []);

  const loadImportHistory = useCallback(async (): Promise<void> => {
    setIsLoadingImportHistory(true);

    try {
      const response = await fetch("/api/v1/product-sourcing/import-history?limit=6", {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | ProductSourcingImportHistoryResponse
        | ApiErrorPayload
        | null;

      if (!response.ok) {
        setImportHistoryFeedback({
          type: "error",
          message: resolveErrorMessage(payload, "No se pudo cargar el historial de imports."),
        });
        return;
      }

      const result = payload as ProductSourcingImportHistoryResponse;
      setImportHistory(result.items);
      setImportHistoryFeedback(null);
    } catch {
      setImportHistoryFeedback({
        type: "error",
        message: "No se pudo cargar el historial de imports.",
      });
    } finally {
      setIsLoadingImportHistory(false);
    }
  }, []);

  const executeSearch = useCallback(async (
    rawQuery: string,
    options: {
      readonly page?: number;
      readonly append?: boolean;
    } = {},
  ): Promise<void> => {
    const normalizedQuery = normalizeQuery(rawQuery);
    const page = options.page ?? 1;
    const append = options.append ?? false;

    setSearchPerformed(true);
    setFeedback(null);
    if (!append) {
      setSessionFeedback(null);
    }

    if (normalizedQuery.replace(/\s/g, "").length < MIN_QUERY_LENGTH) {
      resultsRef.current = [];
      setResults([]);
      setSelectedIds([]);
      setConfirmedZeroStockSignature(null);
      setHasAttemptedDetailsAdvance(false);
      setSearchPage(1);
      setHasMoreResults(false);
      setActiveSearchQuery("");
      setIsLoadingMore(false);
      setIsLoading(false);
      setFeedback("Escribi al menos 3 caracteres para buscar productos.");
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch(
        `/api/v1/product-sourcing/search?q=${encodeURIComponent(normalizedQuery)}&page=${page}&pageSize=${SEARCH_PAGE_SIZE}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ProductSourcingSearchResponse
        | ApiErrorPayload
        | null;

      if (!response.ok) {
        if (!append) {
          resultsRef.current = [];
          setResults([]);
          setSelectedIds([]);
          setSearchPage(1);
          setHasMoreResults(false);
          setActiveSearchQuery("");
        }
        setFeedback(
          resolveErrorMessage(payload, "No se pudo consultar el proveedor en este momento."),
        );
        return;
      }

      const result = payload as ProductSourcingSearchResponse;
      const nextResults = append
        ? mergeSearchResults(resultsRef.current, result.items)
        : result.items;

      resultsRef.current = nextResults;
      setActiveSearchQuery(normalizedQuery);
      setSearchPage(page);
      setHasMoreResults(result.hasMore);
      setResults(nextResults);
      if (!append) {
        setSelectedIds((currentSelectedIds) =>
          currentSelectedIds.filter((selectedId) =>
            nextResults.some((item) => item.sourceProductId === selectedId),
          ),
        );
      }
      if (!append) {
        setImportFeedback(null);
        setImportResult(null);
      }
      setFeedback(
        nextResults.length === 0
          ? "No encontramos resultados para esa busqueda."
          : `Mostrando ${nextResults.length} resultados${result.hasMore ? ". Hay más resultados disponibles." : "."}`,
      );
    } catch (error: unknown) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      if (!append) {
        resultsRef.current = [];
        setResults([]);
        setSelectedIds([]);
        setSearchPage(1);
        setHasMoreResults(false);
        setActiveSearchQuery("");
      }
      setFeedback("No se pudo consultar el proveedor en este momento.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionHydrated) {
      return;
    }

    const resultIds = new Set(results.map((item) => item.sourceProductId));
    const sanitizedSelectedIds = selectedIds.filter((sourceProductId) =>
      resultIds.has(sourceProductId),
    );
    const sanitizedDrafts = Object.fromEntries(
      Object.entries(importDrafts).filter(([sourceProductId]) => resultIds.has(sourceProductId)),
    );
    const shouldPersistImportResult = importResult !== null && importResult.invalidItems.length > 0;
    const hasMeaningfulSession =
      query.trim().length > 0 ||
      activeSearchQuery.trim().length > 0 ||
      results.length > 0 ||
      sanitizedSelectedIds.length > 0 ||
      shouldPersistImportResult;

    if (!hasMeaningfulSession) {
      clearProductSourcingSessionSnapshot();
      return;
    }

    writeProductSourcingSessionSnapshot({
      query,
      activeSearchQuery,
      results,
      selectedIds: sanitizedSelectedIds,
      importDrafts: sanitizedDrafts,
      importResult,
      searchPerformed,
      searchPage,
      hasMoreResults,
    });
  }, [
    activeSearchQuery,
    hasMoreResults,
    importDrafts,
    importResult,
    isSessionHydrated,
    query,
    results,
    searchPage,
    searchPerformed,
    selectedIds,
  ]);

  useEffect(() => {
    if (!isSessionHydrated) {
      return;
    }

    if (debouncedQuery === query) {
      if (shouldSkipNextAutoSearchRef.current) {
        shouldSkipNextAutoSearchRef.current = false;
        return;
      }

      const normalized = normalizeQuery(debouncedQuery);
      if (normalized.length === 0) {
        resultsRef.current = [];
        setResults([]);
        setSelectedIds([]);
        setImportDrafts({});
        setFeedback(null);
        setSessionFeedback(null);
        setImportFeedback(null);
        setImportResult(null);
        setConfirmedZeroStockSignature(null);
        setHasAttemptedDetailsAdvance(false);
        setSearchPerformed(false);
        setSearchPage(1);
        setHasMoreResults(false);
        setActiveSearchQuery("");
        setWizardStep("search");
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      void executeSearch(normalized);
    }
  }, [debouncedQuery, executeSearch, isSessionHydrated, query]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      importConfirmationToastRef.current?.dismiss();
      importConfirmationToastRef.current = null;
    };
  }, []);

  useEffect(() => {
    void loadCategoryMappings();
  }, [loadCategoryMappings]);

  useEffect(() => {
    void loadImportHistory();
  }, [loadImportHistory]);

  useEffect(() => {
    void loadKnownCategories();
  }, [loadKnownCategories]);

  useEffect(() => {
    setImportDrafts((current) => {
      const nextDrafts = { ...current };

      for (const item of results) {
        if (nextDrafts[item.sourceProductId]) {
          continue;
        }

        const suggestedCategoryCode = normalizeCategoryCode(
          item.suggestedCategoryId ?? "other",
        );
        const matchedCategoryCode =
          effectiveKnownCategoryCodes.find((code) => code === suggestedCategoryCode) ??
          suggestedCategoryCode;

        nextDrafts[item.sourceProductId] = {
          ...createImportDraft(item),
          categoryId: matchedCategoryCode,
        };
      }

      return nextDrafts;
    });
  }, [effectiveKnownCategoryCodes, results]);

  const selectedItems = useMemo(
    () => results.filter((item) => selectedIds.includes(item.sourceProductId)),
    [results, selectedIds],
  );
  const previewImageItem = useMemo(
    () =>
      previewImageSourceProductId
        ? results.find((item) => item.sourceProductId === previewImageSourceProductId) ??
          selectedItems.find((item) => item.sourceProductId === previewImageSourceProductId) ??
          null
        : null,
    [previewImageSourceProductId, results, selectedItems],
  );
  const failedQueueCounts = useMemo(
    () => ({
      open: failedQueueEntries.filter(
        (entry) => entry.status === "retryable" || entry.status === "non_recoverable",
      ).length,
      retryable: failedQueueEntries.filter((entry) => entry.status === "retryable").length,
      non_recoverable: failedQueueEntries.filter(
        (entry) => entry.status === "non_recoverable",
      ).length,
      dismissed: failedQueueEntries.filter((entry) => entry.status === "dismissed").length,
      resolved: failedQueueEntries.filter((entry) => entry.status === "resolved").length,
      all: failedQueueEntries.length,
    }),
    [failedQueueEntries],
  );
  const filteredFailedQueueEntries = useMemo(
    () => failedQueueEntries.filter((entry) => matchesFailedQueueFilter(entry, failedQueueFilter)),
    [failedQueueEntries, failedQueueFilter],
  );
  const {
    isObserverSupported: isInfiniteScrollObserverSupported,
    setSentinel: setResultsSentinel,
  } = useInfiniteScrollTrigger({
    enabled: searchPerformed && activeSearchQuery.length > 0 && results.length > 0,
    hasMore: hasMoreResults,
    isLoading: isLoading || isLoadingMore,
    onLoadMore: handleShowMore,
    triggerKey: `${activeSearchQuery}:${searchPage}:${results.length}`,
  });
  const invalidItemsBySourceId = useMemo(
    () =>
      new Map(
        (importResult?.invalidItems ?? []).map((item) => [item.sourceProductId, item] as const),
      ),
    [importResult],
  );
  const retryableInvalidIds = useMemo(
    () =>
      (importResult?.invalidItems ?? [])
        .filter((item) => item.retryable)
        .map((item) => item.sourceProductId),
    [importResult],
  );
  const terminalInvalidIds = useMemo(
    () =>
      (importResult?.invalidItems ?? [])
        .filter((item) => !item.retryable)
        .map((item) => item.sourceProductId),
    [importResult],
  );
  const hasPendingInvalidItems = (importResult?.invalidItems.length ?? 0) > 0;
  const importDraftFieldErrorsBySourceId = useMemo(
    () =>
      Object.fromEntries(
        selectedItems.map((item) => {
          const draft = importDrafts[item.sourceProductId] ?? createImportDraft(item);
          return [
            item.sourceProductId,
            resolveImportDraftFieldErrors(draft, item.name),
          ] as const;
        }),
      ) as Record<string, ImportDraftFieldErrors>,
    [importDrafts, selectedItems],
  );
  const importDraftFieldWarningsBySourceId = useMemo(
    () =>
      Object.fromEntries(
        selectedItems.map((item) => {
          const draft = importDrafts[item.sourceProductId] ?? createImportDraft(item);
          return [
            item.sourceProductId,
            resolveImportDraftFieldWarnings(draft, item.name),
          ] as const;
        }),
      ) as Record<string, ImportDraftFieldWarnings>,
    [importDrafts, selectedItems],
  );
  const selectedItemsWithValidationErrors = useMemo(
    () =>
      selectedItems.filter((item) =>
        hasImportDraftFieldErrors(
          importDraftFieldErrorsBySourceId[item.sourceProductId] ?? {},
        ),
      ),
    [importDraftFieldErrorsBySourceId, selectedItems],
  );
  const step1Ready = selectedItems.length > 0;
  const step2Ready = step1Ready && selectedItemsWithValidationErrors.length === 0;
  const zeroStockWarningSummary = useMemo(
    () =>
      buildZeroStockConfirmationSummary(
        selectedItems,
        (item) => importDrafts[item.sourceProductId] ?? createImportDraft(item),
      ),
    [importDrafts, selectedItems],
  );

  useEffect(() => {
    if (wizardStep !== "search" && selectedItems.length === 0 && importResult === null) {
      setWizardStep("search");
    }
  }, [importResult, selectedItems.length, wizardStep]);

  useEffect(() => {
    if (previewImageSourceProductId && !previewImageItem) {
      setPreviewImageSourceProductId(null);
    }
  }, [previewImageItem, previewImageSourceProductId]);

  function canOpenWizardStep(step: WizardStepId): boolean {
    if (step === "search") {
      return true;
    }

    if (step === "details") {
      return step1Ready;
    }

    return step2Ready || importResult !== null;
  }

  function showZeroStockWarningToast(options: {
    readonly signature: string;
    readonly zeroStockCount: number;
    readonly zeroStockWithoutCostCount: number;
    readonly onContinue: () => void;
    readonly phase: "review" | "import";
  }): void {
    const { onContinue, phase, signature, zeroStockCount, zeroStockWithoutCostCount } = options;

    if (signature.length === 0) {
      onContinue();
      return;
    }

    const noun = zeroStockCount === 1 ? "producto" : "productos";
    const actionCopy =
      phase === "review"
        ? "Tocá Continuar para revisar el paso final o cerrá este aviso para ajustar los datos."
        : zeroStockCount === 1
          ? "Tocá Continuar para importarlo o cerrá este aviso para revisar los datos."
          : "Tocá Continuar para importarlos o cerrá este aviso para revisar los datos.";
    const missingCostCopy =
      zeroStockWithoutCostCount === 0
        ? ""
        : zeroStockWithoutCostCount === 1
          ? " 1 además sigue sin costo cargado."
          : ` ${zeroStockWithoutCostCount} además siguen sin costo cargado.`;

    importConfirmationToastRef.current?.dismiss();
    importConfirmationToastRef.current = showInfoToast({
      title:
        zeroStockCount === 1
          ? "Producto con stock inicial en 0"
          : "Productos con stock inicial en 0",
      description: `Hay ${zeroStockCount} ${noun} con stock inicial en 0.${missingCostCopy} ${actionCopy}`,
      duration: 15000,
      testId: "product-sourcing-import-confirmation-toast",
      action: (
        <ToastAction
          altText={phase === "review" ? "Continuar al paso final" : "Continuar importacion"}
          onClick={() => {
            importConfirmationToastRef.current?.dismiss();
            importConfirmationToastRef.current = null;
            setConfirmedZeroStockSignature(signature);
            onContinue();
          }}
        >
          Continuar
        </ToastAction>
      ),
    });
  }

  function handleWizardStepChange(nextValue: string): void {
    if (!isWizardStepId(nextValue) || !canOpenWizardStep(nextValue)) {
      return;
    }

    if (
      nextValue === "confirm" &&
      zeroStockWarningSummary.signature.length > 0 &&
      confirmedZeroStockSignature !== zeroStockWarningSummary.signature
    ) {
      setHasAttemptedDetailsAdvance(true);
      showZeroStockWarningToast({
        ...zeroStockWarningSummary,
        phase: "review",
        onContinue: () => setWizardStep("confirm"),
      });
      return;
    }

    setWizardStep(nextValue);
  }

  function moveToDetailsStep(): void {
    if (!step1Ready) {
      setImportFeedback({
        type: "error",
        message: "Selecciona al menos un producto para continuar.",
      });
      return;
    }

    setHasAttemptedDetailsAdvance(false);
    setWizardStep("details");
  }

  function moveToConfirmStep(): void {
    setHasAttemptedDetailsAdvance(true);

    if (!step1Ready) {
      setImportFeedback({
        type: "error",
        message: "Selecciona al menos un producto para continuar.",
      });
      setWizardStep("search");
      return;
    }

    if (!step2Ready) {
      const invalidItem = selectedItemsWithValidationErrors[0];
      const firstFieldError = invalidItem
        ? resolveFirstImportDraftError(
            importDraftFieldErrorsBySourceId[invalidItem.sourceProductId] ?? {},
          )
        : undefined;

      setImportFeedback({
        type: "error",
        message:
          firstFieldError ??
          "Completa los datos obligatorios de los productos seleccionados antes de confirmar.",
      });
      setWizardStep("details");
      return;
    }

    if (
      zeroStockWarningSummary.signature.length > 0 &&
      confirmedZeroStockSignature !== zeroStockWarningSummary.signature
    ) {
      showZeroStockWarningToast({
        ...zeroStockWarningSummary,
        phase: "review",
        onContinue: () => setWizardStep("confirm"),
      });
      return;
    }

    setWizardStep("confirm");
  }

  function toggleSelection(sourceProductId: string): void {
    setSelectedIds((current) =>
      current.includes(sourceProductId)
        ? current.filter((itemId) => itemId !== sourceProductId)
        : [...current, sourceProductId],
    );
    setConfirmedZeroStockSignature(null);
    setHasAttemptedDetailsAdvance(false);
    setImportFeedback(null);
    setSessionFeedback(null);
  }

  function updateDraft(
    sourceProductId: string,
    field: keyof ImportDraft,
    value: string,
  ): void {
    let nextDraft: ImportDraft | null = null;
    setImportDrafts((current) => {
      nextDraft = {
        ...(current[sourceProductId] ??
          createImportDraft(
            results.find((item) => item.sourceProductId === sourceProductId) as ExternalCatalogCandidateItem,
          )),
        [field]: value,
      };
      return {
        ...current,
        [sourceProductId]: nextDraft,
      };
    });
    if (nextDraft) {
      setFailedQueueEntries(
        updateProductSourcingFailedQueueDraft("carrefour", sourceProductId, nextDraft),
      );
    }
    setConfirmedZeroStockSignature(null);
    setHasAttemptedDetailsAdvance(false);
    setImportFeedback(null);
    setSessionFeedback(null);
    setFailedQueueFeedback(null);
  }

  function handleDiscardSession(): void {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    importConfirmationToastRef.current?.dismiss();
    importConfirmationToastRef.current = null;
    resultsRef.current = [];
    clearProductSourcingSessionSnapshot();
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setSelectedIds([]);
    setImportDrafts({});
    setFeedback(null);
    setSessionFeedback(null);
    setImportFeedback(null);
    setImportResult(null);
    setConfirmedZeroStockSignature(null);
    setHasAttemptedDetailsAdvance(false);
    setSearchPerformed(false);
    setActiveSearchQuery("");
    setSearchPage(1);
    setHasMoreResults(false);
    setWizardStep("search");
    setIsFailedQueueDialogOpen(false);
    setIsHistoryDialogOpen(false);
    setIsMappingsDialogOpen(false);
    setPreviewImageSourceProductId(null);
    setIsLoading(false);
    setIsLoadingMore(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await executeSearch(query);
  }

  async function handleShowMore(): Promise<void> {
    if (!hasMoreResults || isLoadingMore || activeSearchQuery.length === 0) {
      return;
    }

    await executeSearch(activeSearchQuery, {
      page: searchPage + 1,
      append: true,
    });
  }

  function buildImportPayloadItems(
    itemsToImport: readonly ExternalCatalogCandidateItem[],
    resolveDraft: (item: ExternalCatalogCandidateItem) => ImportDraft,
  ):
    | {
        readonly providerId: "carrefour";
        readonly sourceProductId: string;
        readonly name: string;
        readonly brand: string | null;
        readonly ean: string | null;
        readonly categoryTrail: readonly string[];
        readonly categoryId: string;
        readonly price: number;
        readonly initialStock: number;
        readonly minStock: number;
        readonly cost?: number;
        readonly sourceImageUrl: string | null;
        readonly productUrl: string | null;
      }[]
    | null {
    const payloadItems = [] as {
      readonly providerId: "carrefour";
      readonly sourceProductId: string;
      readonly name: string;
      readonly brand: string | null;
      readonly ean: string | null;
      readonly categoryTrail: readonly string[];
      readonly categoryId: string;
      readonly price: number;
      readonly initialStock: number;
      readonly minStock: number;
      readonly cost?: number;
      readonly sourceImageUrl: string | null;
      readonly productUrl: string | null;
    }[];

    for (const item of itemsToImport) {
      const draft = resolveDraft(item);
      const fieldErrors = resolveImportDraftFieldErrors(draft, item.name);
      const firstFieldError = resolveFirstImportDraftError(fieldErrors);

      if (firstFieldError) {
        setImportFeedback({
          type: "error",
          message: firstFieldError,
        });
        return null;
      }

      const normalizedName = draft.name.trim();
      const normalizedCategoryId = draft.categoryId.trim();
      const price = parseRequiredDecimal(draft.price);
      const initialStock = parseIntegerInput(draft.initialStock);
      const minStock = parseIntegerInput(draft.minStock);
      const cost = parseOptionalDecimal(draft.cost);

      payloadItems.push({
        providerId: item.providerId,
        sourceProductId: item.sourceProductId,
        name: normalizedName,
        brand: item.brand,
        ean: item.ean,
        categoryTrail: item.categoryTrail,
        categoryId: normalizedCategoryId,
        price: price as number,
        initialStock: initialStock as number,
        minStock: minStock as number,
        cost,
        sourceImageUrl: item.imageUrl,
        productUrl: item.productUrl,
      });
    }

    return payloadItems;
  }

  function syncFailedQueueAfterImport(
    itemsToImport: readonly ExternalCatalogCandidateItem[],
    resolveDraft: (item: ExternalCatalogCandidateItem) => ImportDraft,
    result: ProductSourcingImportResponse,
  ): void {
    let nextQueue = readProductSourcingFailedQueueEntries();

    if (result.invalidItems.length > 0) {
      nextQueue = upsertProductSourcingFailedQueueEntries(
        result.invalidItems.flatMap((invalidItem) => {
          const candidate = itemsToImport.find(
            (item) => item.sourceProductId === invalidItem.sourceProductId,
          );
          if (!candidate) {
            return [];
          }

          return [
            {
              candidate,
              draft: resolveDraft(candidate),
              invalidItem,
            },
          ];
        }),
      );
      setFailedQueueFilter("open");
    }

    if (result.items.length > 0) {
      nextQueue = markProductSourcingFailedQueueEntriesResolved(
        result.items.map((entry) => ({
          providerId: entry.providerId,
          sourceProductId: entry.sourceProductId,
          resolvedItem: {
            productId: entry.item.id,
            productName: entry.item.name,
            productSku: entry.item.sku,
          },
        })),
      );
    }

    setFailedQueueEntries(nextQueue);
  }

  async function runImportBatch(
    itemsToImport: readonly ExternalCatalogCandidateItem[],
    resolveDraft: (item: ExternalCatalogCandidateItem) => ImportDraft,
  ): Promise<void> {
    if (itemsToImport.length === 0) {
      setImportFeedback({
        type: "error",
        message: "Selecciona al menos un producto externo para importarlo.",
      });
      return;
    }

    const payloadItems = buildImportPayloadItems(itemsToImport, resolveDraft);
    if (!payloadItems) {
      return;
    }

    importConfirmationToastRef.current?.dismiss();
    importConfirmationToastRef.current = null;
    setIsImporting(true);
    setImportFeedback(null);
    setImportResult(null);
    setFailedQueueFeedback(null);

    try {
      const response = await fetch("/api/v1/product-sourcing/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ items: payloadItems }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ProductSourcingImportResponse
        | ApiErrorPayload
        | null;

      if (!response.ok) {
        setImportFeedback({
          type: "error",
          message: resolveErrorMessage(payload, "No se pudo completar la importacion asistida."),
        });
        return;
      }

      const result = payload as ProductSourcingImportResponse;
      const importedIds = new Set(result.items.map((entry) => entry.sourceProductId));
      const isFullyImported = result.importedCount > 0 && result.invalidItems.length === 0;
      setSelectedIds((current) =>
        isFullyImported
          ? []
          : current.filter((sourceProductId) => !importedIds.has(sourceProductId)),
      );
      if (isFullyImported) {
        resultsRef.current = [];
        clearProductSourcingSessionSnapshot();
        setQuery("");
        setDebouncedQuery("");
        setResults([]);
        setImportDrafts({});
        setSearchPerformed(false);
        setActiveSearchQuery("");
        setSearchPage(1);
        setHasMoreResults(false);
      }
      setConfirmedZeroStockSignature(null);
      setHasAttemptedDetailsAdvance(false);
      setImportResult(result);
      setWizardStep("confirm");
      syncFailedQueueAfterImport(itemsToImport, resolveDraft, result);
      await Promise.all([loadCategoryMappings(), loadImportHistory()]);
      setImportFeedback({
        type: result.importedCount > 0 ? "success" : "error",
        message:
          result.invalidItems.length > 0
            ? `Importacion completada: ${result.importedCount} productos creados y ${result.invalidItems.length} rechazados.`
            : `Importacion completada: ${result.importedCount} productos creados.`,
      });
    } catch {
      setImportFeedback({
        type: "error",
        message: "No se pudo completar la importacion asistida.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleImportSelected(options: ImportActionOptions = {}): Promise<void> {
    const sourceProductIds =
      options.sourceProductIds && options.sourceProductIds.length > 0
        ? options.sourceProductIds
        : selectedIdsRef.current;
    const itemsToImport = resultsRef.current.filter((item) =>
      sourceProductIds.includes(item.sourceProductId),
    );
    const resolveDraft = (item: ExternalCatalogCandidateItem): ImportDraft =>
      importDraftsRef.current[item.sourceProductId] ?? createImportDraft(item);

    if (!options.skipStocklessConfirmation) {
      const zeroStockSummary = buildZeroStockConfirmationSummary(itemsToImport, resolveDraft);

      if (
        zeroStockSummary.signature.length > 0 &&
        confirmedZeroStockSignature !== zeroStockSummary.signature
      ) {
        showZeroStockWarningToast({
          ...zeroStockSummary,
          phase: "import",
          onContinue: () => {
            void handleImportSelected({
              sourceProductIds: itemsToImport.map((item) => item.sourceProductId),
              skipStocklessConfirmation: true,
            });
          },
        });
        return;
      }
    }

    await runImportBatch(
      itemsToImport,
      resolveDraft,
    );
  }

  function handleLoadFailedQueueEntry(entry: ProductSourcingFailedQueueEntry): void {
    setResults((current) => {
      const nextResults = mergeSearchResults(current, [entry.candidate]);
      resultsRef.current = nextResults;
      return nextResults;
    });
    setSelectedIds((current) =>
      current.includes(entry.sourceProductId)
        ? current
        : [...current, entry.sourceProductId],
    );
    setImportDrafts((current) => ({
      ...current,
      [entry.sourceProductId]: { ...entry.draft },
    }));
    setConfirmedZeroStockSignature(null);
    setHasAttemptedDetailsAdvance(false);
    setSearchPerformed(true);
    setFeedback("El producto fallido se volvió a cargar en la selección actual.");
    setSessionFeedback(null);
    setFailedQueueFeedback(null);
    setIsFailedQueueDialogOpen(false);
    setWizardStep("details");
  }

  async function handleRetryFailedQueueEntry(
    entry: ProductSourcingFailedQueueEntry,
  ): Promise<void> {
    setActiveFailedQueueEntryId(entry.id);

    try {
      await runImportBatch([entry.candidate], () => entry.draft);
    } finally {
      setActiveFailedQueueEntryId(null);
    }
  }

  function handleDismissFailedQueueEntry(entry: ProductSourcingFailedQueueEntry): void {
    setFailedQueueEntries(
      markProductSourcingFailedQueueEntryDismissed(entry.providerId, entry.sourceProductId),
    );
    setSelectedIds((current) =>
      current.filter((sourceProductId) => sourceProductId !== entry.sourceProductId),
    );
    setImportResult((current) =>
      current
        ? {
            ...current,
            invalidItems: current.invalidItems.filter(
              (invalidItem) => invalidItem.sourceProductId !== entry.sourceProductId,
            ),
          }
        : current,
    );
    setFailedQueueFeedback({
      type: "success",
      message: `Se descartó ${entry.candidate.name} de la bandeja persistente.`,
    });
  }

  function keepOnlyInvalidSelection(): void {
    const pendingIds = (importResult?.invalidItems ?? []).map((item) => item.sourceProductId);
    setSelectedIds(pendingIds);
    setConfirmedZeroStockSignature(null);
    setHasAttemptedDetailsAdvance(false);
  }

  function dismissTerminalInvalidItems(): void {
    if (terminalInvalidIds.length === 0) {
      return;
    }

    setSelectedIds((current) =>
      current.filter((sourceProductId) => !terminalInvalidIds.includes(sourceProductId)),
    );
    setConfirmedZeroStockSignature(null);
    setHasAttemptedDetailsAdvance(false);
    setImportResult((current) =>
      current
        ? {
            ...current,
            invalidItems: current.invalidItems.filter((item) => item.retryable),
          }
        : current,
    );
  }

  function updateCategoryMappingDraft(externalCategoryPath: string, value: string): void {
    setCategoryMappingDrafts((current) => ({
      ...current,
      [externalCategoryPath]: value,
    }));
    setMappingFeedback(null);
  }

  async function handleSaveCategoryMapping(externalCategoryPath: string): Promise<void> {
    const internalCategoryId = categoryMappingDrafts[externalCategoryPath]?.trim();
    if (!internalCategoryId) {
      setMappingFeedback({
        type: "error",
        message: "Selecciona una categoria valida antes de guardar la regla.",
      });
      return;
    }

    setActiveMappingPath(externalCategoryPath);

    try {
      const response = await fetch("/api/v1/product-sourcing/category-mappings", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          providerId: "carrefour",
          externalCategoryPath,
          internalCategoryId,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMappingFeedback({
          type: "error",
          message: resolveErrorMessage(payload, "No se pudo actualizar la regla de categoria."),
        });
        return;
      }

      await loadCategoryMappings();
      setMappingFeedback({
        type: "success",
        message: "La regla de categoria se actualizo correctamente.",
      });
    } catch {
      setMappingFeedback({
        type: "error",
        message: "No se pudo actualizar la regla de categoria.",
      });
    } finally {
      setActiveMappingPath(null);
    }
  }

  async function handleDeleteCategoryMapping(externalCategoryPath: string): Promise<void> {
    setActiveMappingPath(externalCategoryPath);

    try {
      const response = await fetch("/api/v1/product-sourcing/category-mappings", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          providerId: "carrefour",
          externalCategoryPath,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok && response.status !== 204) {
        setMappingFeedback({
          type: "error",
          message: resolveErrorMessage(payload, "No se pudo eliminar la regla de categoria."),
        });
        return;
      }

      await loadCategoryMappings();
      setMappingFeedback({
        type: "success",
        message: "La regla de categoria se elimino correctamente.",
      });
    } catch {
      setMappingFeedback({
        type: "error",
        message: "No se pudo eliminar la regla de categoria.",
      });
    } finally {
      setActiveMappingPath(null);
    }
  }

  const compactHeaderActionClassName =
    "inline-flex min-h-[2.9rem] items-center gap-2 rounded-[1.15rem] border border-slate-200 bg-white px-3 text-[0.84rem] font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]";
  const compactHeaderCountClassName =
    "rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-500";

  function renderHeaderActions(options: {
    readonly compact?: boolean;
    readonly inPopover?: boolean;
  } = {}): JSX.Element {
    const { compact = false, inPopover = false } = options;
    const actionClassName = compact
      ? compactHeaderActionClassName
      : "inline-flex min-h-[3.25rem] items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]";
    const countClassName = compact
      ? compactHeaderCountClassName
      : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500";
    const sessionActionClassName = compact
      ? "inline-flex min-h-[2.9rem] items-center justify-center rounded-[1.15rem] border border-blue-200 bg-white px-3 text-[0.84rem] font-semibold text-blue-900"
      : "inline-flex min-h-[3.25rem] items-center justify-center rounded-[1.25rem] border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-900";
    const closePopover = (): void => {
      if (inPopover) {
        setIsHeaderActionsOpen(false);
      }
    };

    return (
      <>
        <button
          type="button"
          data-testid="product-sourcing-open-failed-queue"
          onClick={() => {
            closePopover();
            setIsFailedQueueDialogOpen(true);
          }}
          className={actionClassName}
        >
          <Package size={16} />
          Bandeja
          <span className={countClassName}>{failedQueueCounts.open}</span>
        </button>
        <button
          type="button"
          data-testid="product-sourcing-open-mappings"
          onClick={() => {
            closePopover();
            setIsMappingsDialogOpen(true);
          }}
          className={actionClassName}
        >
          <Shapes size={16} />
          Categorías
          <span className={countClassName}>{categoryMappings.length}</span>
        </button>
        <button
          type="button"
          data-testid="product-sourcing-open-history"
          onClick={() => {
            closePopover();
            setIsHistoryDialogOpen(true);
          }}
          className={actionClassName}
        >
          <History size={16} />
          Historial
          <span className={countClassName}>{importHistory.length}</span>
        </button>
        {sessionFeedback ? (
          <button
            type="button"
            data-testid="product-sourcing-discard-session-button"
            onClick={() => {
              closePopover();
              handleDiscardSession();
            }}
            className={sessionActionClassName}
          >
            Descartar sesión
          </button>
        ) : null}
      </>
    );
  }

  return (
    <main
      className={[
        embedded
          ? "min-h-full bg-[#f7f7f8] px-4 py-4 lg:px-6 lg:py-6"
          : "min-h-screen bg-[#f7f7f8] px-4 py-4 lg:px-6 lg:py-6",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-[1520px] flex-col gap-4">
        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 px-5 py-5 lg:px-6 lg:py-6">
            <div>
              <Link
                href="/products"
                data-testid="product-sourcing-back-link"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
              >
                <ArrowLeft size={16} />
                Volver a productos
              </Link>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-[2.4rem] leading-none font-semibold tracking-tight text-slate-950 lg:text-[2.85rem] min-[1480px]:whitespace-nowrap">
                    Importar productos al catálogo
                  </h1>
                  <p className="mt-3 max-w-[42rem] text-base text-slate-600 lg:text-lg">
                    Buscá productos, elegí las variantes correctas y completá el alta en tres
                    pasos claros.
                  </p>
                </div>

                <div className="flex shrink-0 items-start justify-end min-[1480px]:hidden">
                  <Popover open={isHeaderActionsOpen} onOpenChange={setIsHeaderActionsOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        data-testid="product-sourcing-open-header-actions"
                        className="inline-flex min-h-[3rem] min-w-[3rem] items-center justify-center rounded-[1.15rem] border border-slate-200 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                        aria-label="Abrir acciones de sourcing"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-[min(16rem,calc(100vw-1rem))] rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-[0_18px_44px_rgba(15,23,42,0.12)] sm:w-[16rem]"
                    >
                      <div className="flex flex-col gap-2">
                        {renderHeaderActions({ compact: true, inPopover: true })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="hidden shrink-0 items-center gap-2 pt-1 min-[1480px]:flex">
                  {renderHeaderActions({ compact: true })}
                </div>
              </div>
            </div>

            <Tabs value={wizardStep} onValueChange={handleWizardStepChange} className="mt-1">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 lg:grid-cols-3">
                {WIZARD_STEP_ORDER.map((step) => {
                  const title =
                    step === "search"
                      ? "1. Buscar y seleccionar"
                      : step === "details"
                        ? "2. Ajustar datos"
                        : "3. Confirmar e importar";
                  const isActive = wizardStep === step;
                  const isComplete =
                    step === "search"
                      ? step1Ready
                      : step === "details"
                        ? step2Ready
                        : importResult !== null;

                  return (
                    <TabsTrigger
                      key={step}
                      value={step}
                      data-testid={`product-sourcing-step-${step}`}
                      disabled={!canOpenWizardStep(step)}
                      className="h-auto justify-start rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4 text-left data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                      <div className="w-full">
                        <p
                          className={`text-[0.78rem] font-semibold uppercase tracking-[0.16em] ${
                            isActive ? "text-white" : "text-slate-500"
                          }`}
                        >
                          {title}
                        </p>
                        <span
                          className={[
                            "mt-2 inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold",
                            isComplete
                              ? isActive
                                ? "border border-white/35 bg-white/15 text-white"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : isActive
                                ? "border border-white/35 bg-white/10 text-white/90"
                                : "border border-slate-200 bg-slate-50 text-slate-500",
                          ].join(" ")}
                        >
                          {isComplete ? "Listo" : "Pendiente"}
                        </span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent
                value="search"
                className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 lg:p-5"
              >
                <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      1. Buscar y seleccionar
                    </p>
                    <p className="mt-2 text-base text-slate-600">
                      Armá el lote eligiendo los productos externos correctos antes de editar sus
                      datos finales.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchPerformed && activeSearchQuery.length > 0 ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {results.length} resultados visibles
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.18)]">
                      <span data-testid="product-sourcing-selected-count">{selectedIds.length}</span>
                      {selectedIds.length === 1 ? "seleccionado" : "seleccionados"}
                    </span>
                  </div>
                </div>

                <form className="flex flex-col gap-3 xl:flex-row" onSubmit={handleSubmit}>
                  <label className="flex min-h-[4rem] flex-1 items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4">
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin text-blue-600" />
                    ) : (
                      <Search size={18} className="text-slate-400" />
                    )}
                    <input
                      data-testid="product-sourcing-search-input"
                      type="text"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setSessionFeedback(null);
                      }}
                      placeholder="Ej. coca cola zero 2,25"
                      className="w-full border-none bg-transparent text-base text-slate-900 outline-none"
                    />
                  </label>

                  <button
                    type="submit"
                    data-testid="product-sourcing-search-button"
                    className="flex min-h-[4rem] items-center justify-center gap-2 rounded-[1.75rem] bg-blue-600 px-6 text-base font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.25)]"
                  >
                    <Search size={18} />
                    Buscar
                  </button>
                </form>

                {results.length > 0 ? (
                  <>
                    <section
                      data-testid="product-sourcing-results-grid"
                      className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                    >
                      {results.map((item) => {
                        const isSelected = selectedIds.includes(item.sourceProductId);

                        return (
                          <ProductDisplayCard
                            key={item.sourceProductId}
                            testId={`product-sourcing-result-${item.sourceProductId}`}
                            contentClassName="min-h-[24.5rem] gap-3.5 p-4"
                            headerLeft={
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-blue-700">
                                Carrefour
                              </span>
                            }
                            headerRight={
                              <button
                                type="button"
                                onClick={() => toggleSelection(item.sourceProductId)}
                                data-testid={`product-sourcing-toggle-${item.sourceProductId}`}
                                className={[
                                  "inline-flex min-h-[2.45rem] items-center gap-2 rounded-xl px-3 text-sm font-semibold",
                                  isSelected
                                    ? "bg-emerald-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-700",
                                ].join(" ")}
                              >
                                {isSelected ? (
                                  <CheckSquare size={16} />
                                ) : (
                                  <XSquare size={16} />
                                )}
                                {isSelected ? "Seleccionado" : "Seleccionar"}
                              </button>
                            }
                            media={
                              item.imageUrl ? (
                                <button
                                  type="button"
                                  data-testid={`product-sourcing-search-image-preview-trigger-${item.sourceProductId}`}
                                  onClick={() =>
                                    setPreviewImageSourceProductId(item.sourceProductId)
                                  }
                                  className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-[0_12px_24px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                  aria-label={`Ver imagen ampliada de ${item.name}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- External retailer images are dynamic and validated through the sourcing workflow. */}
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    loading="eager"
                                    className="h-full w-full object-contain transition group-hover:scale-[1.03]"
                                  />
                                  <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                                    Ver foto
                                  </span>
                                </button>
                              ) : (
                                <Store size={28} className="text-slate-400" />
                              )
                            }
                            mediaClassName="h-[8.8rem] rounded-[1.4rem] bg-transparent p-0 lg:h-[9.25rem]"
                            title={item.name}
                            subtitle={item.brand ?? "Marca no informada"}
                            titleClassName="text-[0.98rem] leading-[1.1]"
                            subtitleClassName="text-[0.82rem] leading-tight"
                            supporting={
                              <div className="flex flex-wrap gap-1.5 text-[0.7rem] text-slate-500">
                                {item.categoryTrail.slice(0, 2).map((trail) => (
                                  <span
                                    key={trail}
                                    className="rounded-full bg-slate-100 px-2.5 py-1 font-medium"
                                  >
                                    {trail
                                      .split("/")
                                      .map((segment) => segment.trim())
                                      .filter(Boolean)
                                      .map((segment) => humanizeIdentifier(segment))
                                      .join(" / ")}
                                  </span>
                                ))}
                              </div>
                            }
                            details={
                              <div className="grid gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
                                <div className="flex items-center justify-between gap-3">
                                  <span>EAN</span>
                                  <span
                                    data-testid={`product-sourcing-ean-${item.sourceProductId}`}
                                    className="font-semibold text-slate-900"
                                  >
                                    {item.ean ?? "Sin EAN"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>Precio de referencia</span>
                                  <span className="font-semibold text-slate-900">
                                    {item.referencePrice !== null
                                      ? formatCurrency(item.referencePrice)
                                      : "Sin precio"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>Categoría sugerida</span>
                                  <span className="font-semibold text-slate-900">
                                    {item.suggestedCategoryId
                                      ? labelForCategory(item.suggestedCategoryId)
                                      : "Sin sugerencia"}
                                  </span>
                                </div>
                              </div>
                            }
                          />
                        );
                      })}
                    </section>

                    <div className="mt-5 flex justify-center">
                      {hasMoreResults ? (
                        <div className="flex flex-col items-center gap-3">
                          <div
                            ref={setResultsSentinel}
                            data-testid="product-sourcing-infinite-scroll-sentinel"
                            className="h-2 w-full"
                            aria-hidden
                          />
                          <p
                            data-testid="product-sourcing-infinite-scroll-status"
                            className="text-sm font-medium text-slate-500"
                          >
                            {isLoadingMore
                              ? "Cargando más resultados..."
                              : "Seguí bajando para ver más resultados."}
                          </p>
                          {!isInfiniteScrollObserverSupported ? (
                            <button
                              type="button"
                              data-testid="product-sourcing-load-more-button"
                              onClick={() => void handleShowMore()}
                              disabled={isLoadingMore}
                              className={[
                                "inline-flex min-h-[3.2rem] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold",
                                isLoadingMore
                                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                  : "border border-slate-200 bg-white text-slate-900 shadow-[0_12px_22px_rgba(15,23,42,0.08)]",
                              ].join(" ")}
                            >
                              {isLoadingMore ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : null}
                              {isLoadingMore
                                ? "Cargando más resultados..."
                                : "Mostrar más resultados"}
                            </button>
                          ) : null}
                        </div>
                      ) : searchPerformed ? (
                        <p
                          data-testid="product-sourcing-results-end"
                          className="text-sm font-medium text-slate-500"
                        >
                          No hay más resultados para esta búsqueda.
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : searchPerformed && !isLoading ? (
                  <article className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No hay candidatos visibles para la búsqueda actual.
                  </article>
                ) : (
                  <article className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    Buscá productos para empezar a armar el lote de importación.
                  </article>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    data-testid="product-sourcing-next-to-details"
                    onClick={moveToDetailsStep}
                    disabled={!step1Ready}
                    className="inline-flex min-h-[3.2rem] w-full items-center justify-center gap-2 rounded-[1.2rem] bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  >
                    Continuar con seleccionados
                    <ChevronRight size={16} />
                  </button>
                </div>
              </TabsContent>

              <TabsContent
                value="details"
                className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 lg:p-5"
              >
                <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      2. Ajustar datos
                    </p>
                    <p className="mt-2 text-base text-slate-600">
                      Confirmá nombre, categoría, precio e inventario inicial antes de pasar al
                      paso final.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {selectedItems.length === 1
                      ? "1 producto para editar"
                      : `${selectedItems.length} productos para editar`}
                  </span>
                </div>

                {selectedItems.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedItems.map((item) => {
                      const draft = importDrafts[item.sourceProductId] ?? createImportDraft(item);
                      const skuPreview = resolveImportedProductSku(
                        item.providerId,
                        item.sourceProductId,
                      );
                      const fieldErrors =
                        importDraftFieldErrorsBySourceId[item.sourceProductId] ?? {};
                      const fieldWarnings =
                        importDraftFieldWarningsBySourceId[item.sourceProductId] ?? {};
                      const shouldShowFieldWarnings =
                        hasAttemptedDetailsAdvance &&
                        hasImportDraftFieldWarnings(fieldWarnings);
                      const warningMessages = [
                        fieldWarnings.initialStock,
                        fieldWarnings.cost,
                      ].filter((message, index, collection): message is string => {
                        if (typeof message !== "string" || message.length === 0) {
                          return false;
                        }

                        return collection.indexOf(message) === index;
                      });

                      return (
                        <article
                          key={item.sourceProductId}
                          className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row">
                            <div className="flex items-start gap-4 xl:w-[20rem]">
                              {item.imageUrl ? (
                                <button
                                  type="button"
                                  data-testid={`product-sourcing-image-preview-trigger-${item.sourceProductId}`}
                                  onClick={() =>
                                    setPreviewImageSourceProductId(item.sourceProductId)
                                  }
                                  className="group flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-[0_12px_24px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                  aria-label={`Ver imagen ampliada de ${item.name}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- External retailer images are dynamic and validated through the sourcing workflow. */}
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-contain transition group-hover:scale-[1.03]"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                                  <Store size={28} className="text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-slate-900">
                                  {item.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  SKU previsto: {skuPreview}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.brand ?? "Marca no informada"}
                                  {item.ean ? ` • EAN ${item.ean}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => toggleSelection(item.sourceProductId)}
                                  className="shrink-0 text-xs font-semibold text-slate-500"
                                >
                                  Quitar
                                </button>
                              </div>

                              <div className="mt-2 grid gap-3">
                                <label className="grid gap-1 text-sm text-slate-600">
                                  <span className="font-medium text-slate-700">Nombre final</span>
                                  <input
                                    data-testid={`product-sourcing-import-name-${item.sourceProductId}`}
                                    {...getFormControlValidationProps(Boolean(fieldErrors.name))}
                                    type="text"
                                    value={draft.name}
                                    onChange={(event) =>
                                      updateDraft(
                                        item.sourceProductId,
                                        "name",
                                        event.target.value,
                                      )
                                    }
                                    className="min-h-[2.9rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                                  />
                                </label>

                                <CategoryInputField
                                  label="Categoría final"
                                  inputTestId={`product-sourcing-import-category-${item.sourceProductId}`}
                                  categoryCode={draft.categoryId}
                                  knownCategoryCodes={effectiveKnownCategoryCodes}
                                  invalid={Boolean(fieldErrors.categoryId)}
                                  onCategoryCodeChange={(nextCategoryCode) =>
                                    updateDraft(
                                      item.sourceProductId,
                                      "categoryId",
                                      nextCategoryCode,
                                    )
                                  }
                                  required
                                />

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <label className="grid gap-1 text-sm text-slate-600">
                                    <span className="font-medium text-slate-700">Precio</span>
                                    <input
                                      data-testid={`product-sourcing-import-price-${item.sourceProductId}`}
                                      {...getFormControlValidationProps(Boolean(fieldErrors.price))}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={draft.price}
                                      onChange={(event) =>
                                        updateDraft(
                                          item.sourceProductId,
                                          "price",
                                          event.target.value,
                                        )
                                      }
                                      className="min-h-[2.9rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                                    />
                                  </label>

                                  <label className="grid gap-1 text-sm text-slate-600">
                                    <span className="font-medium text-slate-700">
                                      Stock inicial
                                    </span>
                                    <input
                                      data-testid={`product-sourcing-import-stock-${item.sourceProductId}`}
                                      {...getFormControlValidationProps(
                                        Boolean(
                                          fieldErrors.initialStock ||
                                            (shouldShowFieldWarnings && fieldWarnings.initialStock),
                                        ),
                                      )}
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={draft.initialStock}
                                      onChange={(event) =>
                                        updateDraft(
                                          item.sourceProductId,
                                          "initialStock",
                                          event.target.value,
                                        )
                                      }
                                      className="min-h-[2.9rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                                    />
                                  </label>

                                  <label className="grid gap-1 text-sm text-slate-600">
                                    <span className="font-medium text-slate-700">Costo</span>
                                    <input
                                      data-testid={`product-sourcing-import-cost-${item.sourceProductId}`}
                                      {...getFormControlValidationProps(
                                        Boolean(
                                          fieldErrors.cost ||
                                            (shouldShowFieldWarnings && fieldWarnings.cost),
                                        ),
                                      )}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={draft.cost}
                                      onChange={(event) =>
                                        updateDraft(
                                          item.sourceProductId,
                                          "cost",
                                          event.target.value,
                                        )
                                      }
                                      className="min-h-[2.9rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                                    />
                                  </label>

                                  <label className="grid gap-1 text-sm text-slate-600">
                                    <span className="font-medium text-slate-700">
                                      Stock mínimo
                                    </span>
                                    <input
                                      data-testid={`product-sourcing-import-min-stock-${item.sourceProductId}`}
                                      {...getFormControlValidationProps(
                                        Boolean(fieldErrors.minStock),
                                      )}
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={draft.minStock}
                                      onChange={(event) =>
                                        updateDraft(
                                          item.sourceProductId,
                                          "minStock",
                                          event.target.value,
                                        )
                                      }
                                      className="min-h-[2.9rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                                    />
                                  </label>
                                </div>

                                {shouldShowFieldWarnings ? (
                                  <div
                                    data-testid={`product-sourcing-item-warning-${item.sourceProductId}`}
                                    className="rounded-[1.15rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                  >
                                    {warningMessages.map((message) => (
                                      <p key={message}>{message}</p>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Seleccioná resultados desde el paso 1 para editar sus datos finales.
                  </div>
                )}

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    data-testid="product-sourcing-back-to-search"
                    onClick={() => setWizardStep("search")}
                    className="inline-flex min-h-[3.2rem] w-full items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 sm:w-auto"
                  >
                    <ArrowLeft size={16} />
                    Volver a la búsqueda
                  </button>
                  <button
                    type="button"
                    data-testid="product-sourcing-next-to-confirm"
                    onClick={moveToConfirmStep}
                    disabled={!step1Ready}
                    className="inline-flex min-h-[3.2rem] w-full items-center justify-center gap-2 rounded-[1.2rem] bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(37,99,235,0.28)] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                  >
                    Revisar importación
                    <ChevronRight size={16} />
                  </button>
                </div>
              </TabsContent>

              <TabsContent
                value="confirm"
                className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 lg:p-5"
              >
                <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      3. Confirmar e importar
                    </p>
                    <p className="mt-2 text-base text-slate-600">
                      Revisá el lote final y confirmá la importación cuando ya no queden dudas.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {selectedItems.length > 0
                      ? `${selectedItems.length} listos para importar`
                      : importResult
                        ? "Lote procesado"
                        : "Sin selección activa"}
                  </span>
                </div>

                {hasPendingInvalidItems ? (
                  <div
                    data-testid="product-sourcing-pending-invalid-panel"
                    className="mb-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-900">
                          Quedaron {importResult?.invalidItems.length ?? 0} productos pendientes.
                        </p>
                        <p className="text-sm text-amber-800">
                          Los recuperables se pueden reintentar. Los no recuperables conviene
                          quitarlos de la selección.
                        </p>
                      </div>

                      <div className="grid gap-2 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          data-testid="product-sourcing-keep-only-invalid-button"
                          onClick={keepOnlyInvalidSelection}
                          className="inline-flex min-h-[2.8rem] w-full items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 sm:w-auto"
                        >
                          Dejar solo rechazados
                        </button>
                        <button
                          type="button"
                          data-testid="product-sourcing-retry-invalid-button"
                          onClick={() =>
                            void handleImportSelected({
                              sourceProductIds: retryableInvalidIds,
                            })
                          }
                          disabled={retryableInvalidIds.length === 0 || isImporting}
                          className={[
                            "inline-flex min-h-[2.8rem] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold sm:w-auto",
                            retryableInvalidIds.length === 0 || isImporting
                              ? "cursor-not-allowed bg-slate-200 text-slate-500"
                              : "bg-amber-500 text-slate-950",
                          ].join(" ")}
                        >
                          Reintentar recuperables
                        </button>
                        <button
                          type="button"
                          data-testid="product-sourcing-dismiss-terminal-invalid-button"
                          onClick={dismissTerminalInvalidItems}
                          disabled={terminalInvalidIds.length === 0}
                          className={[
                            "inline-flex min-h-[2.8rem] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold sm:w-auto",
                            terminalInvalidIds.length === 0
                              ? "cursor-not-allowed bg-slate-200 text-slate-500"
                              : "bg-slate-900 text-white",
                          ].join(" ")}
                        >
                          Quitar no recuperables
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selectedItems.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedItems.map((item) => {
                      const draft = importDrafts[item.sourceProductId] ?? createImportDraft(item);
                      const invalidItem = invalidItemsBySourceId.get(item.sourceProductId);
                      const skuPreview = resolveImportedProductSku(
                        item.providerId,
                        item.sourceProductId,
                      );

                      return (
                        <article
                          key={`confirm-${item.sourceProductId}`}
                          className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                              {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- External retailer images are dynamic and validated through the sourcing workflow.
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Store size={28} className="text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-base font-semibold text-slate-900">
                                    {draft.name.trim() || item.name}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {labelForCategory(draft.categoryId)} • {skuPreview}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setWizardStep("details")}
                                  className="text-xs font-semibold text-blue-700"
                                >
                                  Editar
                                </button>
                              </div>

                              {invalidItem ? (
                                <div
                                  data-testid={`product-sourcing-invalid-card-${item.sourceProductId}`}
                                  className={[
                                    "mt-3 rounded-xl border px-3 py-3 text-sm",
                                    invalidItemTone(invalidItem),
                                  ].join(" ")}
                                >
                                  <p className="font-semibold">
                                    {invalidItemStatusLabel(invalidItem)}
                                  </p>
                                  <p className="mt-1 text-xs">{invalidItem.reason}</p>
                                </div>
                              ) : null}

                              <div className="mt-3 grid gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <p className="font-semibold text-slate-500">Precio final</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {parseRequiredDecimal(draft.price) !== null
                                      ? formatCurrency(parseRequiredDecimal(draft.price) as number)
                                      : "Pendiente"}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-500">Stock inicial</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {draft.initialStock || "0"}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-500">Costo</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {draft.cost.trim().length > 0
                                      ? formatCurrency(Number(draft.cost))
                                      : "Sin costo"}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-500">Stock mínimo</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {draft.minStock}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : !importResult ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No hay productos seleccionados para confirmar.
                  </div>
                ) : null}

                {importResult ? (
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {importResult.items.length > 0 ? (
                      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-emerald-900">
                            Productos creados
                          </p>
                          <Link
                            href="/products"
                            data-testid="product-sourcing-go-products-link"
                            className="text-sm font-semibold text-emerald-700"
                          >
                            Ver en productos
                          </Link>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                          {importResult.items.map((entry) => (
                            <li
                              key={entry.sourceProductId}
                              data-testid={`product-sourcing-import-result-${entry.sourceProductId}`}
                              className="rounded-xl border border-emerald-200 bg-white px-3 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
                                  {entry.item.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- Managed product images are controlled by the application.
                                    <img
                                      src={entry.item.imageUrl}
                                      alt={entry.item.name}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <Package size={18} className="text-emerald-700" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold">{entry.item.name}</p>
                                  <p className="mt-1 text-xs text-emerald-700">
                                    {labelForCategory(entry.item.categoryId)} • {entry.item.sku} •{" "}
                                    {formatCurrency(entry.item.price)}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {importResult.invalidItems.length > 0 ? (
                      <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4">
                        <p className="text-sm font-semibold text-rose-900">Rechazados</p>
                        <ul className="mt-3 space-y-2 text-sm text-rose-800">
                          {importResult.invalidItems.map((entry) => {
                            const candidate = results.find(
                              (item) => item.sourceProductId === entry.sourceProductId,
                            );

                            return (
                              <li
                                key={`${entry.row}-${entry.sourceProductId}`}
                                data-testid={`product-sourcing-invalid-result-${entry.sourceProductId}`}
                                className="rounded-xl border border-rose-200 bg-white px-3 py-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-100 bg-rose-50">
                                    {candidate?.imageUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element -- External retailer images are dynamic and validated through the sourcing workflow.
                                      <img
                                        src={candidate.imageUrl}
                                        alt={candidate.name}
                                        className="h-full w-full object-contain"
                                      />
                                    ) : (
                                      <Package size={18} className="text-rose-700" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold">
                                      {entry.name ?? entry.sourceProductId}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold">
                                      {invalidItemStatusLabel(entry)}
                                    </p>
                                    <p className="mt-1 text-xs">{entry.reason}</p>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    data-testid="product-sourcing-back-to-details"
                    onClick={() => setWizardStep("details")}
                    className="inline-flex min-h-[3.2rem] w-full items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 sm:w-auto"
                  >
                    <ArrowLeft size={16} />
                    Volver a editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleImportSelected()}
                    data-testid="product-sourcing-import-button"
                    disabled={!step2Ready || isImporting}
                    className={[
                      "inline-flex min-h-[3.2rem] w-full items-center justify-center rounded-[1.2rem] px-5 text-sm font-semibold transition sm:w-auto",
                      !step2Ready || isImporting
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]",
                    ].join(" ")}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Importando...
                      </>
                    ) : (
                      "Importar selección"
                    )}
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </article>

        {isFailedQueueDialogOpen ? (
          <SourcingDialog
            title="Bandeja de fallidos entre sesiones"
            testId="product-sourcing-failed-queue-dialog"
            onClose={() => setIsFailedQueueDialogOpen(false)}
          >
            <section
              data-testid="product-sourcing-failed-queue-panel"
              className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Pendientes persistentes
                  </p>
                  <p className="mt-2 max-w-[56rem] text-sm text-slate-600">
                    Los rechazos de importación quedan guardados para revisión posterior. Desde acá
                    podés filtrarlos, recargarlos en la selección, reintentarlos o descartarlos.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Estado
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {failedQueueCounts.open}
                  </p>
                  <p className="text-sm text-slate-500">
                    pendientes activos de {failedQueueCounts.all} registros guardados
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {FAILED_QUEUE_FILTERS.map((filterOption) => (
                  <button
                    key={filterOption}
                    type="button"
                    data-testid={`product-sourcing-failed-queue-filter-${filterOption}`}
                    onClick={() => setFailedQueueFilter(filterOption)}
                    className={[
                      "inline-flex min-h-[2.7rem] items-center justify-center rounded-xl px-4 text-sm font-semibold",
                      failedQueueFilter === filterOption
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    {failedQueueFilterLabel(filterOption)} ({failedQueueCounts[filterOption]})
                  </button>
                ))}
              </div>

              {filteredFailedQueueEntries.length === 0 ? (
                <div
                  data-testid="product-sourcing-failed-queue-empty"
                  className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500"
                >
                  No hay registros para el filtro seleccionado.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {filteredFailedQueueEntries.map((entry) => {
                    const isQueueActionRunning = activeFailedQueueEntryId === entry.id;

                    return (
                      <article
                        key={entry.id}
                        data-testid={`product-sourcing-failed-queue-entry-${entry.sourceProductId}`}
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {entry.candidate.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {entry.candidate.brand ?? "Marca no informada"} • intento{" "}
                              {entry.failureCount}
                            </p>
                          </div>
                          <span
                            className={[
                              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold",
                              failedQueueStatusTone(entry.status),
                            ].join(" ")}
                          >
                            {failedQueueStatusLabel(entry.status)}
                          </span>
                        </div>

                        <div className="mt-3 rounded-[1.25rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                          <p className="font-semibold text-slate-900">{entry.invalidItem.reason}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Última actualización {formatDateTime(entry.updatedAt)}
                          </p>
                          {entry.resolvedItem ? (
                            <p className="mt-2 text-xs font-medium text-emerald-700">
                              Resuelto como {entry.resolvedItem.productName} •{" "}
                              {entry.resolvedItem.productSku}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-3 grid gap-2 rounded-[1.25rem] border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 sm:grid-cols-2">
                          <div>
                            <p className="font-semibold text-slate-700">Categoría</p>
                            <p className="mt-1">{labelForCategory(entry.draft.categoryId)}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">Precio</p>
                            <p className="mt-1">
                              {entry.draft.price.trim().length > 0
                                ? formatCurrency(Number(entry.draft.price))
                                : "Pendiente"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">Stock inicial</p>
                            <p className="mt-1">{entry.draft.initialStock || "0"}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">Costo</p>
                            <p className="mt-1">
                              {entry.draft.cost.trim().length > 0
                                ? formatCurrency(Number(entry.draft.cost))
                                : "Pendiente"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                          <button
                            type="button"
                            data-testid={`product-sourcing-failed-queue-load-${entry.sourceProductId}`}
                            onClick={() => handleLoadFailedQueueEntry(entry)}
                            className="inline-flex min-h-[2.8rem] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 sm:w-auto"
                          >
                            Cargar en selección
                          </button>
                          <button
                            type="button"
                            data-testid={`product-sourcing-failed-queue-retry-${entry.sourceProductId}`}
                            onClick={() => void handleRetryFailedQueueEntry(entry)}
                            disabled={
                              entry.status !== "retryable" || isQueueActionRunning || isImporting
                            }
                            className={[
                              "inline-flex min-h-[2.8rem] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold sm:w-auto",
                              entry.status !== "retryable" ||
                              isQueueActionRunning ||
                              isImporting
                                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                : "bg-amber-500 text-slate-950",
                            ].join(" ")}
                          >
                            {isQueueActionRunning ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : null}
                            {isQueueActionRunning ? "Reintentando..." : "Reintentar ahora"}
                          </button>
                          <button
                            type="button"
                            data-testid={`product-sourcing-failed-queue-dismiss-${entry.sourceProductId}`}
                            onClick={() => handleDismissFailedQueueEntry(entry)}
                            disabled={entry.status === "dismissed" || isQueueActionRunning}
                            className={[
                              "inline-flex min-h-[2.8rem] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold sm:w-auto",
                              entry.status === "dismissed" || isQueueActionRunning
                                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                                : "border border-rose-200 bg-rose-50 text-rose-700",
                            ].join(" ")}
                          >
                            Descartar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </SourcingDialog>
        ) : null}

        {previewImageItem?.imageUrl ? (
          <SourcingDialog
            title={previewImageItem.name}
            testId="product-sourcing-image-preview-dialog"
            onClose={() => setPreviewImageSourceProductId(null)}
            maxWidthClassName="max-w-[980px]"
          >
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                Revisá la imagen ampliada para confirmar que corresponde al producto que vas a dar
                de alta.
              </p>
              <div className="flex items-center justify-center overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 md:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element -- External retailer images are dynamic and validated through the sourcing workflow. */}
                <img
                  src={previewImageItem.imageUrl}
                  alt={previewImageItem.name}
                  className="max-h-[70dvh] w-auto max-w-full object-contain"
                />
              </div>
            </div>
          </SourcingDialog>
        ) : null}

        {isMappingsDialogOpen ? (
          <SourcingDialog
            title="Reglas de categoría aprendidas"
            testId="product-sourcing-mappings-dialog"
            onClose={() => setIsMappingsDialogOpen(false)}
          >
            <section
              data-testid="product-sourcing-mappings-panel"
              className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-6"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Reglas aprendidas
                  </p>
                  <p className="mt-2 max-w-[52rem] text-sm text-slate-600">
                    El sourcing aprende el destino interno de cada camino externo y te permite
                    corregirlo sin tocar la base.
                  </p>
                </div>

                {isLoadingMappings ? (
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Cargando reglas
                  </div>
                ) : null}
              </div>

              {categoryMappings.length === 0 && !isLoadingMappings ? (
                <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Todavía no hay reglas aprendidas. Importá un producto y la categoría confirmada
                  quedará disponible para futuras búsquedas.
                </div>
              ) : null}

              {categoryMappings.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {categoryMappings.map((mapping) => {
                    const testIdFragment = toTestIdFragment(mapping.externalCategoryPath);
                    const draftValue =
                      categoryMappingDrafts[mapping.externalCategoryPath] ??
                      mapping.internalCategoryId;
                    const options = effectiveKnownCategoryCodes.includes(draftValue)
                      ? effectiveKnownCategoryCodes
                      : [draftValue, ...effectiveKnownCategoryCodes];
                    const isBusy = activeMappingPath === mapping.externalCategoryPath;

                    return (
                      <article
                        key={mapping.id}
                        data-testid={`product-sourcing-mapping-row-${testIdFragment}`}
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                              Carrefour
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {humanizeExternalCategoryPath(
                                mapping.externalCategoryPath,
                                humanizeIdentifier,
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Actualizado {formatDateTime(mapping.updatedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                          <label className="grid gap-1 text-sm text-slate-600">
                            <span className="font-medium text-slate-700">Categoría interna</span>
                            <select
                              data-testid={`product-sourcing-mapping-category-${testIdFragment}`}
                              value={draftValue}
                              onChange={(event) =>
                                updateCategoryMappingDraft(
                                  mapping.externalCategoryPath,
                                  event.target.value,
                                )
                              }
                              className="min-h-[2.9rem] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                            >
                              {options.map((option) => (
                                <option key={option} value={option}>
                                  {labelForCategory(option)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <button
                            type="button"
                            data-testid={`product-sourcing-mapping-save-${testIdFragment}`}
                            onClick={() => void handleSaveCategoryMapping(mapping.externalCategoryPath)}
                            disabled={isBusy}
                            className="inline-flex min-h-[2.9rem] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                          >
                            {isBusy ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Save size={16} />
                            )}
                            Guardar
                          </button>

                          <button
                            type="button"
                            data-testid={`product-sourcing-mapping-delete-${testIdFragment}`}
                            onClick={() =>
                              void handleDeleteCategoryMapping(mapping.externalCategoryPath)
                            }
                            disabled={isBusy}
                            className="inline-flex min-h-[2.9rem] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700"
                          >
                            {isBusy ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Eliminar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>
          </SourcingDialog>
        ) : null}

        {isHistoryDialogOpen ? (
          <SourcingDialog
            title="Historial reciente"
            testId="product-sourcing-import-history-dialog"
            onClose={() => setIsHistoryDialogOpen(false)}
          >
            <section
              data-testid="product-sourcing-import-history-panel"
              className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-6"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Historial reciente
                  </p>
                  <p className="mt-2 max-w-[52rem] text-sm text-slate-600">
                    Vista persistente de los productos importados desde sourcing, con nombre
                    interno, SKU, categoría final y fecha real de importación.
                  </p>
                </div>

                {isLoadingImportHistory ? (
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Cargando historial
                  </div>
                ) : null}
              </div>

              {importHistory.length === 0 && !isLoadingImportHistory ? (
                <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Todavía no hay imports persistidos en este entorno. Cuando completes uno,
                  aparecerá acá con sus datos reales.
                </div>
              ) : null}

              {importHistory.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {importHistory.map((entry) => (
                    <article
                      key={entry.id}
                      data-testid={`product-sourcing-history-row-${entry.sourceProductId}`}
                      className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.2rem] bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Stored sourcing assets are dynamic but controlled by the application. */}
                          <img
                            src={entry.storedImagePublicUrl}
                            alt={entry.productName}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                            Carrefour
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {entry.productName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.productSku} • {labelForCategory(entry.mappedCategoryId)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.brand ?? "Marca no informada"}
                            {entry.ean ? ` • EAN ${entry.ean}` : ""}
                          </p>
                          <p className="mt-2 text-xs font-medium text-slate-600">
                            Importado {formatDateTime(entry.importedAt)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </SourcingDialog>
        ) : null}
      </div>
    </main>
  );
}
