import { ProductNotFoundError } from "@/modules/catalog/domain/errors/ProductDomainError";
import type { ProductRepository } from "@/modules/catalog/domain/repositories/ProductRepository";
import type { FindOrCreateCustomerUseCase } from "@/modules/customers/application/use-cases/FindOrCreateCustomerUseCase";
import {
  NoopCashSaleRecorder,
  type CashSaleRecorder,
} from "@/modules/sales/domain/services/CashSaleRecorder";
import {
  NoopOnAccountDebtRecorder,
  type OnAccountDebtRecorder,
} from "@/modules/sales/domain/services/OnAccountDebtRecorder";
import {
  NoopSaleInventoryRecorder,
  type SaleInventoryRecorder,
} from "@/modules/sales/domain/services/SaleInventoryRecorder";
import { calculateSaleTotal } from "@/modules/sales/domain/policies/SalePricingPolicy";

import { Sale } from "../../domain/entities/Sale";
import type { SaleLineItem } from "../../domain/entities/Sale";
import { SaleInitialPaymentOutOfRangeError } from "../../domain/errors/SaleDomainError";
import type { SaleRepository } from "../../domain/repositories/SaleRepository";

export interface CreateSaleUseCaseInput {
  readonly items: ReadonlyArray<{
    readonly productId: string;
    readonly quantity: number;
  }>;
  readonly paymentMethod: "cash" | "on_account";
  readonly customerId?: string;
  readonly customerName?: string;
  readonly createCustomerIfMissing?: boolean;
  readonly initialPaymentAmount?: number;
  readonly occurredAt?: Date;
  readonly cashRegisterId?: string;
  readonly actorId?: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export interface CreateSaleUseCaseOutput {
  readonly saleId: string;
  readonly paymentMethod: "cash" | "on_account";
  readonly customerId?: string;
  readonly total: number;
  readonly amountPaid: number;
  readonly outstandingAmount: number;
  readonly createdAt: string;
}

export class CreateSaleUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly productRepository: ProductRepository,
    private readonly findOrCreateCustomerUseCase: FindOrCreateCustomerUseCase,
    private readonly onAccountDebtRecorder: OnAccountDebtRecorder = new NoopOnAccountDebtRecorder(),
    private readonly cashSaleRecorder: CashSaleRecorder = new NoopCashSaleRecorder(),
    private readonly saleInventoryRecorder: SaleInventoryRecorder = new NoopSaleInventoryRecorder(),
  ) {}

  async execute(input: CreateSaleUseCaseInput): Promise<CreateSaleUseCaseOutput> {
    const pricedItems = await this.resolveSaleItems(input.items);
    const occurredAt = input.occurredAt ?? new Date();
    const sale = Sale.create({
      id: crypto.randomUUID(),
      items: pricedItems,
      paymentMethod: input.paymentMethod,
      createdAt: occurredAt,
    });

    if (input.paymentMethod === "on_account") {
      const customer = await this.findOrCreateCustomerUseCase.execute({
        customerId: input.customerId,
        customerName: input.customerName,
        createCustomerIfMissing: input.createCustomerIfMissing,
      });

      if (customer) {
        sale.assignCustomer(customer.getId());
      }
    }

    sale.ensureCheckoutRules();
    const total = calculateSaleTotal(sale.getItems());
    const initialPaymentAmount =
      sale.getPaymentMethod() === "on_account"
        ? Number((input.initialPaymentAmount ?? 0).toFixed(2))
        : 0;

    if (
      sale.getPaymentMethod() === "on_account" &&
      (initialPaymentAmount < 0 || initialPaymentAmount >= total)
    ) {
      throw new SaleInitialPaymentOutOfRangeError(total);
    }

    await this.saleRepository.save(sale);
    await this.saleInventoryRecorder.recordSaleInventory({
      saleId: sale.getId(),
      occurredAt: sale.getCreatedAt(),
      items: sale.getItems().map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    if (sale.getPaymentMethod() === "on_account" && sale.getCustomerId()) {
      await this.onAccountDebtRecorder.recordOnAccountDebt({
        saleId: sale.getId(),
        customerId: sale.getCustomerId() as string,
        amount: total,
        initialPaymentAmount,
        occurredAt: sale.getCreatedAt(),
      });
    }

    const amountPaid =
      sale.getPaymentMethod() === "cash" ? total : initialPaymentAmount;
    const outstandingAmount =
      sale.getPaymentMethod() === "cash" ? 0 : Number((total - amountPaid).toFixed(2));

    if (amountPaid > 0 && input.actorId) {
      await this.cashSaleRecorder.recordCashSale({
        saleId: sale.getId(),
        amount: amountPaid,
        occurredAt: sale.getCreatedAt(),
        actorId: input.actorId,
        cashRegisterId: input.cashRegisterId,
        accessibleRegisterIds: input.accessibleRegisterIds,
      });
    }

    return {
      saleId: sale.getId(),
      paymentMethod: sale.getPaymentMethod(),
      customerId: sale.getCustomerId(),
      total,
      amountPaid,
      outstandingAmount,
      createdAt: sale.getCreatedAt().toISOString(),
    };
  }

  private async resolveSaleItems(
    items: CreateSaleUseCaseInput["items"],
  ): Promise<readonly SaleLineItem[]> {
    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const products = await this.productRepository.list({ ids: productIds });
    const productById = new Map(
      products.map((product) => {
        const primitives = product.toPrimitives();
        return [primitives.id, primitives.price] as const;
      }),
    );

    return items.map((item) => {
      const unitPrice = productById.get(item.productId);
      if (unitPrice === undefined) {
        throw new ProductNotFoundError(item.productId);
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      } satisfies SaleLineItem;
    });
  }
}
