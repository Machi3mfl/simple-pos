import {
  EmptySaleItemsError,
  InvalidSaleQuantityError,
  SaleCustomerRequiredError,
} from "../errors/SaleDomainError";

export type SalePaymentMethod = "cash" | "on_account";

export interface SaleLineItem {
  readonly productId: string;
  readonly quantity: number;
}

interface CreateSaleProps {
  readonly id: string;
  readonly items: readonly SaleLineItem[];
  readonly paymentMethod: SalePaymentMethod;
  readonly createdAt: Date;
}

export class Sale {
  private readonly id: string;
  private readonly items: readonly SaleLineItem[];
  private readonly paymentMethod: SalePaymentMethod;
  private readonly createdAt: Date;
  private customerId?: string;

  private constructor(props: CreateSaleProps) {
    this.id = props.id;
    this.items = props.items;
    this.paymentMethod = props.paymentMethod;
    this.createdAt = props.createdAt;
  }

  static create(props: CreateSaleProps): Sale {
    if (props.items.length === 0) {
      throw new EmptySaleItemsError();
    }

    props.items.forEach((line) => {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new InvalidSaleQuantityError(line.productId);
      }
    });

    return new Sale(props);
  }

  static rehydrate(props: {
    readonly id: string;
    readonly items: readonly SaleLineItem[];
    readonly paymentMethod: SalePaymentMethod;
    readonly customerId?: string;
    readonly createdAt: Date;
  }): Sale {
    const sale = Sale.create({
      id: props.id,
      items: props.items,
      paymentMethod: props.paymentMethod,
      createdAt: props.createdAt,
    });

    if (props.customerId) {
      sale.assignCustomer(props.customerId);
    }

    return sale;
  }

  assignCustomer(customerId: string): void {
    this.customerId = customerId;
  }

  ensureCheckoutRules(): void {
    if (this.paymentMethod === "on_account" && !this.customerId) {
      throw new SaleCustomerRequiredError();
    }
  }

  getId(): string {
    return this.id;
  }

  getItems(): readonly SaleLineItem[] {
    return this.items;
  }

  getPaymentMethod(): SalePaymentMethod {
    return this.paymentMethod;
  }

  getCustomerId(): string | undefined {
    return this.customerId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  toPrimitives(): {
    readonly saleId: string;
    readonly items: readonly SaleLineItem[];
    readonly paymentMethod: SalePaymentMethod;
    readonly customerId?: string;
    readonly createdAt: string;
  } {
    return {
      saleId: this.id,
      items: this.items,
      paymentMethod: this.paymentMethod,
      customerId: this.customerId,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
