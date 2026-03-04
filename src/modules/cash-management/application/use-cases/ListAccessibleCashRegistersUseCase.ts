import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import type { CashRegisterRepository } from "../../domain/repositories/CashRegisterRepository";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import { toCashRegisterSessionSummary, type CashRegisterSessionSummary } from "../mappers/toCashRegisterSessionSummary";

export interface ListAccessibleCashRegistersUseCaseInput {
  readonly accessibleRegisterIds?: readonly string[];
}

export interface AccessibleCashRegisterView {
  readonly id: string;
  readonly name: string;
  readonly locationCode?: string;
  readonly isActive: boolean;
  readonly activeSession: CashRegisterSessionSummary | null;
}

export class ListAccessibleCashRegistersUseCase {
  constructor(
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: ListAccessibleCashRegistersUseCaseInput,
  ): Promise<readonly AccessibleCashRegisterView[]> {
    const registers = await this.cashRegisterRepository.listActive();
    const accessibleRegisterIds = new Set(input.accessibleRegisterIds ?? []);
    const visibleRegisters =
      accessibleRegisterIds.size > 0
        ? registers.filter((register) => accessibleRegisterIds.has(register.getId()))
        : registers;

    return Promise.all(
      visibleRegisters.map(async (register) => {
        const activeSession = await this.cashRegisterSessionRepository.findOpenByRegisterId(
          register.getId(),
        );
        const registerPrimitives = register.toPrimitives();

        return {
          id: registerPrimitives.id,
          name: registerPrimitives.name,
          locationCode: registerPrimitives.locationCode,
          isActive: registerPrimitives.isActive,
          activeSession: activeSession
            ? await toCashRegisterSessionSummary(
                activeSession,
                this.actorAccessRepository,
              )
            : null,
        };
      }),
    );
  }
}
