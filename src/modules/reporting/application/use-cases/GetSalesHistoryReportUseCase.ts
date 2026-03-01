import { calculateSaleTotal } from "@/modules/sales/domain/policies/SalePricingPolicy";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";
import type { SalePaymentMethod } from "@/modules/sales/domain/entities/Sale";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import type { DebtLedgerRepository } from "@/modules/accounts-receivable/domain/repositories/DebtLedgerRepository";
import { summarizeDebtByOrder } from "@/modules/accounts-receivable/domain/services/SummarizeDebtByOrder";

export type SalesHistoryPaymentStatus = "paid" | "partial" | "pending";

export interface GetSalesHistoryReportInput {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly paymentMethod?: SalePaymentMethod;
}

export interface SalesHistoryReportItem {
  readonly saleId: string;
  readonly paymentMethod: SalePaymentMethod;
  readonly customerId?: string;
  readonly customerName?: string;
  readonly total: number;
  readonly amountPaid: number;
  readonly outstandingAmount: number;
  readonly paymentStatus: SalesHistoryPaymentStatus;
  readonly itemCount: number;
  readonly createdAt: string;
}

export class GetSalesHistoryReportUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly debtLedgerRepository: DebtLedgerRepository,
  ) {}

  async execute(
    input: GetSalesHistoryReportInput = {},
  ): Promise<readonly SalesHistoryReportItem[]> {
    const sales = await this.saleRepository.list({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      paymentMethod: input.paymentMethod,
    });

    const customerIds = Array.from(
      new Set(
        sales
          .map((sale) => sale.getCustomerId())
          .filter((customerId): customerId is string => Boolean(customerId)),
      ),
    );

    const customerNameById = new Map<string, string>();
    const orderDebtSummaryByCustomerId = new Map<
      string,
      ReadonlyMap<string, { readonly paidAmount: number; readonly outstandingAmount: number }>
    >();
    await Promise.all(
      customerIds.map(async (customerId) => {
        const [customer, ledger] = await Promise.all([
          this.customerRepository.findById(customerId),
          this.debtLedgerRepository.listByCustomer(customerId),
        ]);

        if (customer) {
          customerNameById.set(customerId, customer.getName());
        }

        orderDebtSummaryByCustomerId.set(customerId, summarizeDebtByOrder(ledger));
      }),
    );

    return sales.map((sale) => ({
      ...(() => {
        const customerId = sale.getCustomerId();
        if (!customerId) {
          return {};
        }

        return {
          customerId,
          customerName: customerNameById.get(customerId),
        };
      })(),
      saleId: sale.getId(),
      paymentMethod: sale.getPaymentMethod(),
      ...(() => {
        const total = Number(calculateSaleTotal(sale.getItems()).toFixed(2));
        if (sale.getPaymentMethod() === "cash") {
          return {
            total,
            amountPaid: total,
            outstandingAmount: 0,
            paymentStatus: "paid" as const,
          };
        }

        const customerId = sale.getCustomerId();
        const orderDebtSummary =
          customerId
            ? orderDebtSummaryByCustomerId.get(customerId)?.get(sale.getId())
            : undefined;
        const amountPaid = Number((orderDebtSummary?.paidAmount ?? 0).toFixed(2));
        const outstandingAmount = Number(
          (orderDebtSummary?.outstandingAmount ?? total).toFixed(2),
        );
        const paymentStatus =
          outstandingAmount <= 0 ? "paid" : amountPaid > 0 ? "partial" : "pending";

        return {
          total,
          amountPaid,
          outstandingAmount,
          paymentStatus,
        };
      })(),
      itemCount: sale.getItems().reduce((sum, line) => sum + line.quantity, 0),
      createdAt: sale.getCreatedAt().toISOString(),
    }));
  }
}
