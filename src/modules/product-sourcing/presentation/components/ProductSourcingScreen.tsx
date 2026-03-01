"use client";

import { ArrowLeft, CheckSquare, Loader2, Search, Store, XSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";

import { resolveImportedProductSku } from "../../domain/services/ResolveImportedProductSku";

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
    readonly reason: string;
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

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 500;

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
    minStock: "0",
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

export function ProductSourcingScreen(): JSX.Element {
  const { formatCurrency, humanizeIdentifier, labelForCategory } = useI18n();
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [results, setResults] = useState<readonly ExternalCatalogCandidateItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [importDrafts, setImportDrafts] = useState<Record<string, ImportDraft>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<FeedbackState | null>(null);
  const [importResult, setImportResult] = useState<ProductSourcingImportResponse | null>(null);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const executeSearch = useCallback(async (rawQuery: string): Promise<void> => {
    const normalizedQuery = normalizeQuery(rawQuery);

    setSearchPerformed(true);
    setFeedback(null);

    if (normalizedQuery.replace(/\s/g, "").length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSelectedIds([]);
      setIsLoading(false);
      setFeedback("Escribi al menos 3 caracteres para buscar en Carrefour.");
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/v1/product-sourcing/search?q=${encodeURIComponent(normalizedQuery)}&page=1&pageSize=8`,
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
        setResults([]);
        setSelectedIds([]);
        setFeedback(
          resolveErrorMessage(payload, "No se pudo consultar Carrefour en este momento."),
        );
        return;
      }

      const result = payload as ProductSourcingSearchResponse;
      setResults(result.items);
      setSelectedIds((current) =>
        current.filter((selectedId) => result.items.some((item) => item.sourceProductId === selectedId)),
      );
      setImportFeedback(null);
      setImportResult(null);
      setFeedback(
        result.items.length === 0
          ? "No encontramos resultados para esa busqueda."
          : `Se encontraron ${result.items.length} resultados en Carrefour.`,
      );
    } catch (error: unknown) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setResults([]);
      setSelectedIds([]);
      setFeedback("No se pudo consultar Carrefour en este momento.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery === query) {
      const normalized = normalizeQuery(debouncedQuery);
      if (normalized.length === 0) {
        setResults([]);
        setSelectedIds([]);
        setFeedback(null);
        setImportFeedback(null);
        setImportResult(null);
        setSearchPerformed(false);
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
        return;
      }

      void executeSearch(normalized);
    }
  }, [debouncedQuery, executeSearch, query]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setImportDrafts((current) => {
      let changed = false;
      const next: Record<string, ImportDraft> = { ...current };

      for (const item of results) {
        if (!next[item.sourceProductId]) {
          next[item.sourceProductId] = createImportDraft(item);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [results]);

  const selectedItems = useMemo(
    () => results.filter((item) => selectedIds.includes(item.sourceProductId)),
    [results, selectedIds],
  );

  function toggleSelection(sourceProductId: string): void {
    setSelectedIds((current) =>
      current.includes(sourceProductId)
        ? current.filter((itemId) => itemId !== sourceProductId)
        : [...current, sourceProductId],
    );
    setImportFeedback(null);
  }

  function updateDraft(
    sourceProductId: string,
    field: keyof ImportDraft,
    value: string,
  ): void {
    setImportDrafts((current) => ({
      ...current,
      [sourceProductId]: {
        ...(current[sourceProductId] ?? createImportDraft(results.find((item) => item.sourceProductId === sourceProductId) as ExternalCatalogCandidateItem)),
        [field]: value,
      },
    }));
    setImportFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await executeSearch(query);
  }

  async function handleImportSelected(): Promise<void> {
    if (selectedItems.length === 0) {
      setImportFeedback({
        type: "error",
        message: "Selecciona al menos un producto externo para importarlo.",
      });
      return;
    }

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

    for (const item of selectedItems) {
      const draft = importDrafts[item.sourceProductId] ?? createImportDraft(item);
      const normalizedName = draft.name.trim();
      const normalizedCategoryId = draft.categoryId.trim();
      const price = parseRequiredDecimal(draft.price);
      const initialStock = parseIntegerInput(draft.initialStock);
      const minStock = parseIntegerInput(draft.minStock);
      const cost = parseOptionalDecimal(draft.cost);

      if (normalizedName.length < 2) {
        setImportFeedback({
          type: "error",
          message: `Completa un nombre valido para ${item.name}.`,
        });
        return;
      }

      if (normalizedCategoryId.length === 0) {
        setImportFeedback({
          type: "error",
          message: `Completa la categoria final para ${item.name}.`,
        });
        return;
      }

      if (price === null || price <= 0) {
        setImportFeedback({
          type: "error",
          message: `Ingresa un precio valido para ${item.name}.`,
        });
        return;
      }

      if (initialStock === null || initialStock < 0) {
        setImportFeedback({
          type: "error",
          message: `Ingresa un stock inicial entero valido para ${item.name}.`,
        });
        return;
      }

      if (minStock === null || minStock < 0) {
        setImportFeedback({
          type: "error",
          message: `Ingresa un stock minimo entero valido para ${item.name}.`,
        });
        return;
      }

      if (initialStock > 0 && (cost === undefined || cost <= 0)) {
        setImportFeedback({
          type: "error",
          message: `Si cargas stock inicial para ${item.name}, tambien debes informar el costo.`,
        });
        return;
      }

      payloadItems.push({
        providerId: item.providerId,
        sourceProductId: item.sourceProductId,
        name: normalizedName,
        brand: item.brand,
        ean: item.ean,
        categoryTrail: item.categoryTrail,
        categoryId: normalizedCategoryId,
        price,
        initialStock,
        minStock,
        cost,
        sourceImageUrl: item.imageUrl,
        productUrl: item.productUrl,
      });
    }

    setIsImporting(true);
    setImportFeedback(null);
    setImportResult(null);

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
      setSelectedIds((current) => current.filter((sourceProductId) => !importedIds.has(sourceProductId)));
      setImportResult(result);
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

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-4 py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex max-w-[1520px] flex-col gap-4">
        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 px-5 py-5 lg:px-6 lg:py-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <Link
                  href="/products"
                  data-testid="product-sourcing-back-link"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
                >
                  <ArrowLeft size={16} />
                  Volver a productos
                </Link>
                <h1 className="mt-3 text-[2.4rem] leading-none font-semibold tracking-tight text-slate-950 lg:text-[2.85rem]">
                  Busqueda asistida de productos
                </h1>
                <p className="mt-3 max-w-[54rem] text-base text-slate-600 lg:text-lg">
                  Busca en Carrefour Argentina, selecciona variantes reales y carga los datos minimos para importarlas directo al catalogo del POS.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900 xl:max-w-[22rem]">
                <div className="flex items-center gap-2 font-semibold">
                  <Store size={18} />
                  Fuente fija v1
                </div>
                <p className="mt-2">Carrefour Argentina queda bloqueado como proveedor inicial para mantener el flujo simple y visual.</p>
              </div>
            </div>

            <form className="flex flex-col gap-3 xl:flex-row" onSubmit={handleSubmit}>
              <label className="flex min-h-[4rem] flex-1 items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4">
                {isLoading ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Search size={18} className="text-slate-400" />}
                <input
                  data-testid="product-sourcing-search-input"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
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

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div>
                {feedback ? (
                  <div
                    data-testid="product-sourcing-feedback"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {feedback}
                  </div>
                ) : null}
              </div>

              <aside className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Seleccion actual
                    </p>
                    <p
                      data-testid="product-sourcing-selected-count"
                      className="mt-2 text-[2rem] leading-none font-bold tracking-tight text-slate-900"
                    >
                      {selectedIds.length}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleImportSelected()}
                    data-testid="product-sourcing-import-button"
                    disabled={selectedItems.length === 0 || isImporting}
                    className={[
                      "inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition",
                      selectedItems.length === 0 || isImporting
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]",
                    ].join(" ")}
                  >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : "Importar seleccion"}
                  </button>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  Cada producto genera un SKU deterministico para evitar reimportaciones accidentales durante este slice.
                </p>

                {importFeedback ? (
                  <div
                    data-testid="product-sourcing-import-feedback"
                    className={[
                      "mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold",
                      importFeedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700",
                    ].join(" ")}
                  >
                    {importFeedback.message}
                  </div>
                ) : null}

                {selectedItems.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {selectedItems.map((item) => {
                      const draft = importDrafts[item.sourceProductId] ?? createImportDraft(item);
                      const skuPreview = resolveImportedProductSku(item.providerId, item.sourceProductId);

                      return (
                        <article
                          key={item.sourceProductId}
                          className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                              <p className="mt-1 text-xs text-slate-500">SKU previsto: {skuPreview}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleSelection(item.sourceProductId)}
                              className="text-xs font-semibold text-slate-500"
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3">
                            <label className="grid gap-1 text-sm text-slate-600">
                              <span className="font-medium text-slate-700">Nombre final</span>
                              <input
                                data-testid={`product-sourcing-import-name-${item.sourceProductId}`}
                                type="text"
                                value={draft.name}
                                onChange={(event) =>
                                  updateDraft(item.sourceProductId, "name", event.target.value)
                                }
                                className="min-h-[2.9rem] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
                              />
                            </label>

                            <label className="grid gap-1 text-sm text-slate-600">
                              <span className="font-medium text-slate-700">Categoria final</span>
                              <input
                                data-testid={`product-sourcing-import-category-${item.sourceProductId}`}
                                type="text"
                                value={draft.categoryId}
                                onChange={(event) =>
                                  updateDraft(item.sourceProductId, "categoryId", event.target.value)
                                }
                                className="min-h-[2.9rem] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
                              />
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="grid gap-1 text-sm text-slate-600">
                                <span className="font-medium text-slate-700">Precio</span>
                                <input
                                  data-testid={`product-sourcing-import-price-${item.sourceProductId}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.price}
                                  onChange={(event) =>
                                    updateDraft(item.sourceProductId, "price", event.target.value)
                                  }
                                  className="min-h-[2.9rem] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
                                />
                              </label>

                              <label className="grid gap-1 text-sm text-slate-600">
                                <span className="font-medium text-slate-700">Stock inicial</span>
                                <input
                                  data-testid={`product-sourcing-import-stock-${item.sourceProductId}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={draft.initialStock}
                                  onChange={(event) =>
                                    updateDraft(item.sourceProductId, "initialStock", event.target.value)
                                  }
                                  className="min-h-[2.9rem] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
                                />
                              </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="grid gap-1 text-sm text-slate-600">
                                <span className="font-medium text-slate-700">Costo</span>
                                <input
                                  data-testid={`product-sourcing-import-cost-${item.sourceProductId}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.cost}
                                  onChange={(event) =>
                                    updateDraft(item.sourceProductId, "cost", event.target.value)
                                  }
                                  className="min-h-[2.9rem] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
                                />
                              </label>

                              <label className="grid gap-1 text-sm text-slate-600">
                                <span className="font-medium text-slate-700">Stock minimo</span>
                                <input
                                  data-testid={`product-sourcing-import-min-stock-${item.sourceProductId}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={draft.minStock}
                                  onChange={(event) =>
                                    updateDraft(item.sourceProductId, "minStock", event.target.value)
                                  }
                                  className="min-h-[2.9rem] rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none"
                                />
                              </label>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                    Selecciona resultados para completar la importacion desde esta misma pantalla.
                  </div>
                )}

                {importResult ? (
                  <div className="mt-4 space-y-3">
                    {importResult.items.length > 0 ? (
                      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-emerald-900">Productos creados</p>
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
                              <p className="font-semibold">{entry.item.name}</p>
                              <p className="mt-1 text-xs text-emerald-700">
                                {labelForCategory(entry.item.categoryId)} • {entry.item.sku} • {formatCurrency(entry.item.price)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {importResult.invalidItems.length > 0 ? (
                      <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4">
                        <p className="text-sm font-semibold text-rose-900">Rechazados</p>
                        <ul className="mt-3 space-y-2 text-sm text-rose-800">
                          {importResult.invalidItems.map((entry) => (
                            <li key={`${entry.row}-${entry.sourceProductId}`} className="rounded-xl border border-rose-200 bg-white px-3 py-3">
                              <p className="font-semibold">{entry.name ?? entry.sourceProductId}</p>
                              <p className="mt-1 text-xs">{entry.reason}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </article>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {results.map((item) => {
            const isSelected = selectedIds.includes(item.sourceProductId);

            return (
              <article
                key={item.sourceProductId}
                data-testid={`product-sourcing-result-${item.sourceProductId}`}
                className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
              >
                <div className="flex flex-col gap-3 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-blue-700">
                      Carrefour
                    </span>
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
                      {isSelected ? <CheckSquare size={16} /> : <XSquare size={16} />}
                      {isSelected ? "Seleccionado" : "Seleccionar"}
                    </button>
                  </div>

                  <div className="flex h-[10.5rem] items-center justify-center overflow-hidden rounded-[1.25rem] bg-slate-100 lg:h-[11.5rem]">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- External retailer images are dynamic and validated through the sourcing workflow.
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="eager"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Store size={28} className="text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-[1.05rem] leading-tight font-semibold tracking-tight text-slate-900">
                      {item.name}
                    </h2>
                    <p className="text-xs text-slate-500">{item.brand ?? "Marca no informada"}</p>
                    <div className="flex flex-wrap gap-1.5 text-[0.7rem] text-slate-500">
                      {item.categoryTrail.slice(0, 2).map((trail) => (
                        <span key={trail} className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                          {trail
                            .split("/")
                            .map((segment) => segment.trim())
                            .filter(Boolean)
                            .map((segment) => humanizeIdentifier(segment))
                            .join(" / ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <span>EAN</span>
                      <span data-testid={`product-sourcing-ean-${item.sourceProductId}`} className="font-semibold text-slate-900">
                        {item.ean ?? "Sin EAN"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Precio de referencia</span>
                      <span className="font-semibold text-slate-900">
                        {item.referencePrice !== null ? formatCurrency(item.referencePrice) : "Sin precio"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Categoria sugerida</span>
                      <span className="font-semibold text-slate-900">
                        {item.suggestedCategoryId
                          ? labelForCategory(item.suggestedCategoryId)
                          : "Sin sugerencia"}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {searchPerformed && !isLoading && results.length === 0 ? (
          <article className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">
            No hay candidatos visibles para la busqueda actual.
          </article>
        ) : null}
      </div>
    </main>
  );
}
