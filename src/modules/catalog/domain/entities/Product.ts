import {
  InvalidCategoryIdError,
  InvalidInitialStockError,
  InvalidProductNameError,
  InvalidProductPriceError,
  InvalidUnitCostError,
} from "../errors/ProductDomainError";

interface CreateProductProps {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock: number;
  readonly imageUrl: string;
  readonly isActive: boolean;
}

interface CreateNewProductProps {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly initialStock: number;
  readonly cost?: number;
  readonly imageUrl: string;
}

export type BulkPriceUpdateMode = "percentage" | "fixed_amount";

export class Product {
  private readonly id: string;
  private readonly name: string;
  private readonly categoryId: string;
  private readonly price: number;
  private readonly cost?: number;
  private readonly stock: number;
  private readonly imageUrl: string;
  private readonly isActive: boolean;

  private constructor(props: CreateProductProps) {
    this.id = props.id;
    this.name = props.name;
    this.categoryId = props.categoryId;
    this.price = props.price;
    this.cost = props.cost;
    this.stock = props.stock;
    this.imageUrl = props.imageUrl;
    this.isActive = props.isActive;
  }

  static createNew(props: CreateNewProductProps): Product {
    const name = props.name.trim();
    if (name.length < 2) {
      throw new InvalidProductNameError();
    }

    const categoryId = props.categoryId.trim();
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

    return new Product({
      id: props.id,
      name,
      categoryId,
      price: props.price,
      cost: props.cost,
      stock: props.initialStock,
      imageUrl: props.imageUrl,
      isActive: true,
    });
  }

  reprice(mode: BulkPriceUpdateMode, value: number): Product {
    const nextPrice = this.previewReprice(mode, value);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      throw new InvalidProductPriceError();
    }

    return new Product({
      id: this.id,
      name: this.name,
      categoryId: this.categoryId,
      price: Number(nextPrice.toFixed(2)),
      cost: this.cost,
      stock: this.stock,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
    });
  }

  previewReprice(mode: BulkPriceUpdateMode, value: number): number {
    if (mode === "percentage") {
      return this.price * (1 + value / 100);
    }

    return this.price + value;
  }

  getId(): string {
    return this.id;
  }

  getCategoryId(): string {
    return this.categoryId;
  }

  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  toPrimitives(): {
    readonly id: string;
    readonly name: string;
    readonly categoryId: string;
    readonly price: number;
    readonly cost?: number;
    readonly stock: number;
    readonly imageUrl: string;
    readonly isActive: boolean;
  } {
    return {
      id: this.id,
      name: this.name,
      categoryId: this.categoryId,
      price: this.price,
      cost: this.cost,
      stock: this.stock,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
    };
  }
}
