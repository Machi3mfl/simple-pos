import {
  InvalidCategoryIdError,
  InvalidProductEanError,
  InvalidInitialStockError,
  InvalidProductMinStockError,
  InvalidProductNameError,
  InvalidProductPriceError,
  InvalidProductSkuError,
  InvalidUnitCostError,
  MissingInitialStockCostError,
} from "../errors/ProductDomainError";
import { resolveProductSku } from "../services/ResolveProductSku";
import { normalizeCategoryCode } from "@/shared/core/category/categoryNaming";

interface CreateProductProps {
  readonly id: string;
  readonly sku: string;
  readonly ean?: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly minStock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

interface CreateNewProductProps {
  readonly id: string;
  readonly sku?: string;
  readonly ean?: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly initialStock: number;
  readonly cost?: number;
  readonly minStock?: number;
  readonly imageUrl: string;
}

interface UpdateProductDetailsProps {
  readonly sku?: string;
  readonly ean?: string;
  readonly name?: string;
  readonly categoryId?: string;
  readonly price?: number;
  readonly cost?: number;
  readonly minStock?: number;
  readonly imageUrl?: string;
  readonly isActive?: boolean;
}

export type BulkPriceUpdateMode = "percentage" | "fixed_amount" | "set_price";

function validateSku(value: string): string {
  const normalizedSku = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 _-]{0,39}$/.test(normalizedSku)) {
    throw new InvalidProductSkuError();
  }

  return normalizedSku;
}

function validateMinStock(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidProductMinStockError();
  }

  return value;
}

function validateEan(value?: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedEan = value.trim();
  if (normalizedEan.length === 0) {
    return undefined;
  }

  if (!/^[0-9]{8,18}$/.test(normalizedEan)) {
    throw new InvalidProductEanError();
  }

  return normalizedEan;
}

export class Product {
  private readonly id: string;
  private readonly sku: string;
  private readonly ean?: string;
  private readonly name: string;
  private readonly categoryId: string;
  private readonly price: number;
  private readonly cost?: number;
  private readonly stock: number;
  private readonly minStock: number;
  private readonly imageUrl: string;
  private readonly isActive: boolean;

  private constructor(props: CreateProductProps) {
    this.id = props.id;
    this.sku = props.sku;
    this.ean = props.ean;
    this.name = props.name;
    this.categoryId = props.categoryId;
    this.price = props.price;
    this.cost = props.cost;
    this.stock = props.stock;
    this.minStock = props.minStock;
    this.imageUrl = props.imageUrl;
    this.isActive = props.isActive;
  }

  static createNew(props: CreateNewProductProps): Product {
    const name = props.name.trim();
    if (name.length < 2) {
      throw new InvalidProductNameError();
    }

    const categoryId = normalizeCategoryCode(props.categoryId);
    if (categoryId.length === 0) {
      throw new InvalidCategoryIdError();
    }

    if (!Number.isFinite(props.price) || props.price <= 0) {
      throw new InvalidProductPriceError();
    }

    if (!Number.isInteger(props.initialStock) || props.initialStock < 0) {
      throw new InvalidInitialStockError();
    }

    if (props.cost !== undefined && (!Number.isFinite(props.cost) || props.cost <= 0)) {
      throw new InvalidUnitCostError();
    }

    if (props.initialStock > 0 && props.cost === undefined) {
      throw new MissingInitialStockCostError();
    }

    const sku = validateSku(resolveProductSku(categoryId, props.id, props.sku));
    const ean = validateEan(props.ean);
    const minStock = validateMinStock(props.minStock ?? 0);

    return new Product({
      id: props.id,
      sku,
      ean,
      name,
      categoryId,
      price: Number(props.price.toFixed(2)),
      cost: props.cost === undefined ? undefined : Number(props.cost.toFixed(4)),
      stock: props.initialStock,
      minStock,
      imageUrl: props.imageUrl,
      isActive: true,
    });
  }

  static rehydrate(props: CreateProductProps): Product {
    return new Product(props);
  }

  reprice(mode: BulkPriceUpdateMode, value: number): Product {
    const nextPrice = this.previewReprice(mode, value);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      throw new InvalidProductPriceError();
    }

    return new Product({
      id: this.id,
      sku: this.sku,
      ean: this.ean,
      name: this.name,
      categoryId: this.categoryId,
      price: Number(nextPrice.toFixed(2)),
      cost: this.cost,
      stock: this.stock,
      minStock: this.minStock,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
    });
  }

  previewReprice(mode: BulkPriceUpdateMode, value: number): number {
    if (mode === "percentage") {
      return this.price * (1 + value / 100);
    }

    if (mode === "fixed_amount") {
      return this.price + value;
    }

    return value;
  }

  getId(): string {
    return this.id;
  }

  getSku(): string {
    return this.sku;
  }

  getCategoryId(): string {
    return this.categoryId;
  }

  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  withInventorySnapshot(stock: number, weightedAverageUnitCost?: number): Product {
    if (!Number.isFinite(stock) || stock < 0) {
      throw new InvalidInitialStockError();
    }

    if (
      weightedAverageUnitCost !== undefined &&
      (!Number.isFinite(weightedAverageUnitCost) || weightedAverageUnitCost < 0)
    ) {
      throw new InvalidUnitCostError();
    }

    return new Product({
      id: this.id,
      sku: this.sku,
      name: this.name,
      categoryId: this.categoryId,
      price: this.price,
      cost:
        weightedAverageUnitCost === undefined
          ? this.cost
          : Number(weightedAverageUnitCost.toFixed(4)),
      stock: Number(stock.toFixed(4)),
      minStock: this.minStock,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
    });
  }

  updateDetails(props: UpdateProductDetailsProps): Product {
    const nextName = props.name !== undefined ? props.name.trim() : this.name;
    if (nextName.length < 2) {
      throw new InvalidProductNameError();
    }

    const nextCategoryId =
      props.categoryId !== undefined
        ? normalizeCategoryCode(props.categoryId)
        : this.categoryId;
    if (nextCategoryId.length === 0) {
      throw new InvalidCategoryIdError();
    }

    const nextPrice = props.price ?? this.price;
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      throw new InvalidProductPriceError();
    }

    const nextCost = props.cost ?? this.cost;
    if (nextCost !== undefined && (!Number.isFinite(nextCost) || nextCost <= 0)) {
      throw new InvalidUnitCostError();
    }

    const nextMinStock = validateMinStock(props.minStock ?? this.minStock);
    const nextSku = validateSku(resolveProductSku(nextCategoryId, this.id, props.sku ?? this.sku));
    const nextEan = props.ean !== undefined ? validateEan(props.ean) : this.ean;
    const nextImageUrl = props.imageUrl?.trim() || this.imageUrl;

    return new Product({
      id: this.id,
      sku: nextSku,
      ean: nextEan,
      name: nextName,
      categoryId: nextCategoryId,
      price: Number(nextPrice.toFixed(2)),
      cost: nextCost === undefined ? undefined : Number(nextCost.toFixed(4)),
      stock: this.stock,
      minStock: nextMinStock,
      imageUrl: nextImageUrl,
      isActive: props.isActive ?? this.isActive,
    });
  }

  archive(): Product {
    return new Product({
      id: this.id,
      sku: this.sku,
      ean: this.ean,
      name: this.name,
      categoryId: this.categoryId,
      price: this.price,
      cost: this.cost,
      stock: this.stock,
      minStock: this.minStock,
      imageUrl: this.imageUrl,
      isActive: false,
    });
  }

  toPrimitives(): {
    readonly id: string;
    readonly sku: string;
    readonly ean?: string;
    readonly name: string;
    readonly categoryId: string;
    readonly price: number;
    readonly cost?: number;
    readonly stock: number;
    readonly minStock: number;
    readonly imageUrl: string;
    readonly isActive: boolean;
  } {
    return {
      id: this.id,
      sku: this.sku,
      ean: this.ean,
      name: this.name,
      categoryId: this.categoryId,
      price: this.price,
      cost: this.cost,
      stock: this.stock,
      minStock: this.minStock,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
    };
  }
}
