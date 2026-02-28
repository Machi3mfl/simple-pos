import { calculateSaleTotal } from "@/modules/sales/domain/policies/SalePricingPolicy";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";
import type { SalePaymentMethod } from "@/modules/sales/domain/entities/Sale";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";

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
  readonly itemCount: number;
  readonly createdAt: string;
}

export class GetSalesHistoryReportUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly customerRepository: CustomerRepository,
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
    await Promise.all(
      customerIds.map(async (customerId) => {
        const customer = await this.customerRepository.findById(customerId);
        if (customer) {
          customerNameById.set(customerId, customer.getName());
        }
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
      total: Number(calculateSaleTotal(sale.getItems()).toFixed(2)),
      itemCount: sale.getItems().reduce((sum, line) => sum + line.quantity, 0),
      createdAt: sale.getCreatedAt().toISOString(),
    }));
  }
}
