import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import type { ProductRepository } from "@/modules/catalog/domain/repositories/ProductRepository";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";

import { CustomerNotFoundForDebtError } from "../../domain/errors/AccountsReceivableDomainError";
import type { DebtLedgerRepository } from "../../domain/repositories/DebtLedgerRepository";
import { calculateOutstandingBalance } from "../../domain/services/CalculateOutstandingBalance";
import { summarizeDebtByOrder } from "../../domain/services/SummarizeDebtByOrder";

export interface GetCustomerDebtSummaryUseCaseInput {
  readonly customerId: string;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
}

export interface GetCustomerDebtSummaryUseCaseOutput {
  readonly customerId: string;
  readonly customerName: string;
  readonly outstandingBalance: number;
  readonly totalDebtAmount: number;
  readonly totalPaidAmount: number;
  readonly openOrderCount: number;
  readonly lastActivityAt: string;
  readonly orders: ReadonlyArray<{
    readonly orderId: string;
    readonly totalAmount: number;
    readonly amountPaid: number;
    readonly outstandingAmount: number;
    readonly createdAt?: string;
    readonly itemCount?: number;
    readonly saleItems: ReadonlyArray<{
      readonly productId: string;
      readonly productName?: string;
      readonly productImageUrl?: string;
      readonly quantity: number;
      readonly unitPrice: number;
      readonly lineTotal: number;
    }>;
  }>;
  readonly ledger: ReadonlyArray<{
    readonly entryId: string;
    readonly entryType: "debt" | "payment";
    readonly orderId?: string;
    readonly amount: number;
    readonly occurredAt: string;
    readonly notes?: string;
  }>;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export class GetCustomerDebtSummaryUseCase {
  constructor(
    private readonly debtLedgerRepository: DebtLedgerRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly saleRepository: SaleRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    input: GetCustomerDebtSummaryUseCaseInput,
  ): Promise<GetCustomerDebtSummaryUseCaseOutput> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new CustomerNotFoundForDebtError(input.customerId);
    }

    const [fullLedger, filteredLedger, onAccountSales] = await Promise.all([
      this.debtLedgerRepository.listByCustomer(input.customerId),
      this.debtLedgerRepository.listByCustomer(input.customerId, {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      }),
      this.saleRepository.list({ paymentMethod: "on_account" }),
    ]);

    const orderSnapshots = Array.from(summarizeDebtByOrder(fullLedger).values());
    const customerSales = onAccountSales.filter(
      (sale) => sale.getCustomerId() === input.customerId,
    );
    const productIds = Array.from(
      new Set(
        customerSales.flatMap((sale) => sale.getItems().map((item) => item.productId)),
      ),
    );
    const products =
      productIds.length > 0
        ? await this.productRepository.list({ ids: productIds })
        : [];
    const productById = new Map(
      products.map((product) => {
        const primitives = product.toPrimitives();
        return [
          primitives.id,
          {
            name: primitives.name,
            imageUrl: primitives.imageUrl,
          },
        ] as const;
      }),
    );
    const salesById = new Map(
      customerSales.map((sale) => [
        sale.getId(),
        {
          createdAt: sale.getCreatedAt().toISOString(),
          itemCount: sale.getItems().reduce((sum, item) => sum + item.quantity, 0),
          saleItems: sale.getItems().map((item) => {
            const product = productById.get(item.productId);
            const productImageUrl = product?.imageUrl?.trim();

            return {
              productId: item.productId,
              productName: product?.name,
              productImageUrl: productImageUrl ? productImageUrl : undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: roundMoney(item.quantity * item.unitPrice),
            };
          }),
        },
      ] as const),
    );
    const totalDebtAmount = roundMoney(
      orderSnapshots.reduce((sum, snapshot) => sum + snapshot.debtAmount, 0),
    );
    const totalPaidAmount = roundMoney(
      orderSnapshots.reduce((sum, snapshot) => sum + snapshot.paidAmount, 0),
    );
    const openOrders = orderSnapshots
      .filter((snapshot) => snapshot.outstandingAmount > 0)
      .sort((left, right) => {
        const leftCreatedAt = salesById.get(left.orderId)?.createdAt;
        const rightCreatedAt = salesById.get(right.orderId)?.createdAt;

        if (leftCreatedAt && rightCreatedAt) {
          return new Date(rightCreatedAt).getTime() - new Date(leftCreatedAt).getTime();
        }

        return right.outstandingAmount - left.outstandingAmount;
      });
    const lastActivityAt =
      [...fullLedger]
        .sort((left, right) => right.getOccurredAt().getTime() - left.getOccurredAt().getTime())[0]
        ?.getOccurredAt()
        .toISOString() ?? customer.getCreatedAt().toISOString();

    return {
      customerId: input.customerId,
      customerName: customer.getName(),
      outstandingBalance: calculateOutstandingBalance(fullLedger),
      totalDebtAmount,
      totalPaidAmount,
      openOrderCount: openOrders.length,
      lastActivityAt,
      orders: openOrders.map((snapshot) => ({
        orderId: snapshot.orderId,
        totalAmount: snapshot.debtAmount,
        amountPaid: snapshot.paidAmount,
        outstandingAmount: snapshot.outstandingAmount,
        createdAt: salesById.get(snapshot.orderId)?.createdAt,
        itemCount: salesById.get(snapshot.orderId)?.itemCount,
        saleItems: salesById.get(snapshot.orderId)?.saleItems ?? [],
      })),
      ledger: filteredLedger.map((entry) => ({
        entryId: entry.toPrimitives().entryId,
        entryType: entry.toPrimitives().entryType,
        orderId: entry.toPrimitives().orderId,
        amount: entry.toPrimitives().amount,
        occurredAt: entry.toPrimitives().occurredAt,
        notes: entry.toPrimitives().notes,
      })),
    };
  }
}
