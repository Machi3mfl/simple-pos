import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import {
  CashRegisterAssignmentError,
  CashRegisterInactiveError,
  CashRegisterNotFoundError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashRegisterRepository } from "../../domain/repositories/CashRegisterRepository";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import { toCashRegisterSessionSummary, type CashRegisterSessionSummary } from "../mappers/toCashRegisterSessionSummary";

export interface GetActiveCashRegisterSessionUseCaseInput {
  readonly cashRegisterId: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export class GetActiveCashRegisterSessionUseCase {
  constructor(
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: GetActiveCashRegisterSessionUseCaseInput,
  ): Promise<CashRegisterSessionSummary | null> {
    const accessibleRegisterIds = new Set(input.accessibleRegisterIds ?? []);
    if (
      accessibleRegisterIds.size > 0 &&
      !accessibleRegisterIds.has(input.cashRegisterId)
    ) {
      throw new CashRegisterAssignmentError(input.cashRegisterId);
    }

    const register = await this.cashRegisterRepository.getById(input.cashRegisterId);
    if (!register) {
      throw new CashRegisterNotFoundError(input.cashRegisterId);
    }

    if (!register.isEnabled()) {
      throw new CashRegisterInactiveError(input.cashRegisterId);
    }

    const activeSession = await this.cashRegisterSessionRepository.findOpenByRegisterId(
      input.cashRegisterId,
    );

    return activeSession
      ? toCashRegisterSessionSummary(activeSession, this.actorAccessRepository)
      : null;
  }
}
