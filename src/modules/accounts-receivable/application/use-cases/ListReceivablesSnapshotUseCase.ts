import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";

import type { DebtLedgerRepository } from "../../domain/repositories/DebtLedgerRepository";
import { calculateOutstandingBalance } from "../../domain/services/CalculateOutstandingBalance";
import { summarizeDebtByOrder } from "../../domain/services/SummarizeDebtByOrder";

export interface ReceivableSnapshotItem {
  readonly customerId: string;
  readonly customerName: string;
  readonly outstandingBalance: number;
  readonly totalDebtAmount: number;
  readonly totalPaidAmount: number;
  readonly openOrderCount: number;
  readonly lastActivityAt: string;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export class ListReceivablesSnapshotUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly debtLedgerRepository: DebtLedgerRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(): Promise<readonly ReceivableSnapshotItem[]> {
    const onAccountSales = await this.saleRepository.list({
      paymentMethod: "on_account",
    });

    const customerIds = Array.from(
      new Set(
        onAccountSales
          .map((sale) => sale.getCustomerId())
          .filter((customerId): customerId is string => Boolean(customerId)),
      ),
    );

    const items = await Promise.all(
      customerIds.map(async (customerId) => {
        const [customer, ledger] = await Promise.all([
          this.customerRepository.findById(customerId),
          this.debtLedgerRepository.listByCustomer(customerId),
        ]);

        if (!customer || ledger.length === 0) {
          return null;
        }

        const outstandingBalance = calculateOutstandingBalance(ledger);
        if (outstandingBalance <= 0) {
          return null;
        }

        const orderSnapshots = Array.from(summarizeDebtByOrder(ledger).values());
        const totalDebtAmount = roundMoney(
          orderSnapshots.reduce((sum, snapshot) => sum + snapshot.debtAmount, 0),
        );
        const totalPaidAmount = roundMoney(
          orderSnapshots.reduce((sum, snapshot) => sum + snapshot.paidAmount, 0),
        );
        const openOrderCount = orderSnapshots.filter(
          (snapshot) => snapshot.outstandingAmount > 0,
        ).length;
        const lastActivityAt =
          [...ledger]
            .sort(
              (left, right) =>
                right.getOccurredAt().getTime() - left.getOccurredAt().getTime(),
            )[0]
            ?.getOccurredAt()
            .toISOString() ?? customer.getCreatedAt().toISOString();

        return {
          customerId,
          customerName: customer.getName(),
          outstandingBalance,
          totalDebtAmount,
          totalPaidAmount,
          openOrderCount,
          lastActivityAt,
        } satisfies ReceivableSnapshotItem;
      }),
    );

    return items
      .filter((item): item is ReceivableSnapshotItem => item !== null)
      .sort((left, right) => {
        if (right.outstandingBalance !== left.outstandingBalance) {
          return right.outstandingBalance - left.outstandingBalance;
        }

        const lastActivityDifference =
          new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
        if (lastActivityDifference !== 0) {
          return lastActivityDifference;
        }

        return left.customerName.localeCompare(right.customerName, "es");
      });
  }
}
