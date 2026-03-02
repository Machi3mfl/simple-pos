import { expect, test } from "@playwright/test";

import { Product } from "../../src/modules/catalog/domain/entities/Product";
import type { ProductRepository } from "../../src/modules/catalog/domain/repositories/ProductRepository";
import { CreateSaleUseCase } from "../../src/modules/sales/application/use-cases/CreateSaleUseCase";
import type { FindOrCreateCustomerUseCase } from "../../src/modules/customers/application/use-cases/FindOrCreateCustomerUseCase";
import type { SaleRepository } from "../../src/modules/sales/domain/repositories/SaleRepository";
import type { Sale } from "../../src/modules/sales/domain/entities/Sale";
import type { OnAccountDebtRecorder } from "../../src/modules/sales/domain/services/OnAccountDebtRecorder";

class InMemorySaleRepository implements SaleRepository {
  private readonly sales: Sale[] = [];

  async save(sale: Sale): Promise<void> {
    this.sales.push(sale);
  }

  async list(): Promise<readonly Sale[]> {
    return this.sales;
  }
}

test("uses the real catalog price snapshot for on-account totals", async () => {
  const saleRepository = new InMemorySaleRepository();
  const pricedProduct = Product.createNew({
    id: "prod-real-price",
    name: "Gaseosa 2.25",
    categoryId: "drink",
    price: 4450,
    initialStock: 0,
    imageUrl: "",
  });
  const productRepository: ProductRepository = {
    save: async () => undefined,
    saveMany: async () => undefined,
    list: async (filters) => {
      if (!filters?.ids || filters.ids.includes(pricedProduct.getId())) {
        return [pricedProduct];
      }

      return [];
    },
    getById: async (productId) =>
      productId === pricedProduct.getId() ? pricedProduct : null,
    getBySku: async () => null,
  };
  const findOrCreateCustomerUseCase = {
    execute: async () => ({
      getId: () => "customer-001",
    }),
  } as FindOrCreateCustomerUseCase;
  const recordedDebts: Array<{
    readonly amount: number;
    readonly initialPaymentAmount?: number;
  }> = [];
  const onAccountDebtRecorder: OnAccountDebtRecorder = {
    recordOnAccountDebt: async (input) => {
      recordedDebts.push({
        amount: input.amount,
        initialPaymentAmount: input.initialPaymentAmount,
      });
    },
  };
  const useCase = new CreateSaleUseCase(
    saleRepository,
    productRepository,
    findOrCreateCustomerUseCase,
    onAccountDebtRecorder,
  );

  const result = await useCase.execute({
    items: [{ productId: pricedProduct.getId(), quantity: 1 }],
    paymentMethod: "on_account",
    customerName: "Cliente real",
    createCustomerIfMissing: true,
    initialPaymentAmount: 1000,
  });

  expect(result.total).toBe(4450);
  expect(result.amountPaid).toBe(1000);
  expect(result.outstandingAmount).toBe(3450);

  const [savedSale] = await saleRepository.list();
  expect(savedSale?.getItems()).toEqual([
    {
      productId: pricedProduct.getId(),
      quantity: 1,
      unitPrice: 4450,
    },
  ]);
  expect(recordedDebts).toEqual([
    {
      amount: 4450,
      initialPaymentAmount: 1000,
    },
  ]);
});
