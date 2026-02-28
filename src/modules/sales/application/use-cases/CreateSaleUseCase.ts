import type { FindOrCreateCustomerUseCase } from "@/modules/customers/application/use-cases/FindOrCreateCustomerUseCase";
import {
  NoopOnAccountDebtRecorder,
  type OnAccountDebtRecorder,
} from "@/modules/sales/domain/services/OnAccountDebtRecorder";
import { calculateSaleTotal } from "@/modules/sales/domain/policies/SalePricingPolicy";

import { Sale } from "../../domain/entities/Sale";
import type { SaleRepository } from "../../domain/repositories/SaleRepository";

export interface CreateSaleUseCaseInput {
  readonly items: ReadonlyArray<{
    readonly productId: string;
    readonly quantity: number;
  }>;
  readonly paymentMethod: "cash" | "on_account";
  readonly customerId?: string;
  readonly customerName?: string;
}

export interface CreateSaleUseCaseOutput {
  readonly saleId: string;
  readonly paymentMethod: "cash" | "on_account";
  readonly customerId?: string;
  readonly total: number;
  readonly createdAt: string;
}

export class CreateSaleUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly findOrCreateCustomerUseCase: FindOrCreateCustomerUseCase,
    private readonly onAccountDebtRecorder: OnAccountDebtRecorder = new NoopOnAccountDebtRecorder(),
  ) {}

  async execute(input: CreateSaleUseCaseInput): Promise<CreateSaleUseCaseOutput> {
    const sale = Sale.create({
      id: crypto.randomUUID(),
      items: input.items,
      paymentMethod: input.paymentMethod,
      createdAt: new Date(),
    });

    if (input.paymentMethod === "on_account") {
      const customer = await this.findOrCreateCustomerUseCase.execute({
        customerId: input.customerId,
        customerName: input.customerName,
      });

      if (customer) {
        sale.assignCustomer(customer.getId());
      }
    }

    sale.ensureCheckoutRules();
    const total = calculateSaleTotal(sale.getItems());
    await this.saleRepository.save(sale);

    if (sale.getPaymentMethod() === "on_account" && sale.getCustomerId()) {
      await this.onAccountDebtRecorder.recordOnAccountDebt({
        saleId: sale.getId(),
        customerId: sale.getCustomerId() as string,
        amount: total,
        occurredAt: sale.getCreatedAt(),
      });
    }

    return {
      saleId: sale.getId(),
      paymentMethod: sale.getPaymentMethod(),
      customerId: sale.getCustomerId(),
      total,
      createdAt: sale.getCreatedAt().toISOString(),
    };
  }
}
