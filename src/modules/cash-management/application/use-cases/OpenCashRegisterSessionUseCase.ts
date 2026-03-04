import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import { CashMovement } from "../../domain/entities/CashMovement";
import { CashRegisterSession } from "../../domain/entities/CashRegisterSession";
import {
  CashRegisterAssignmentError,
  CashRegisterInactiveError,
  CashRegisterNotFoundError,
  CashRegisterSessionAlreadyOpenError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashMovementRepository } from "../../domain/repositories/CashMovementRepository";
import type { CashRegisterRepository } from "../../domain/repositories/CashRegisterRepository";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import { toCashRegisterSessionSummary, type CashRegisterSessionSummary } from "../mappers/toCashRegisterSessionSummary";

export interface OpenCashRegisterSessionUseCaseInput {
  readonly cashRegisterId: string;
  readonly openingFloatAmount: number;
  readonly openingNotes?: string;
  readonly actorId: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export class OpenCashRegisterSessionUseCase {
  constructor(
    private readonly cashRegisterRepository: CashRegisterRepository,
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: OpenCashRegisterSessionUseCaseInput,
  ): Promise<CashRegisterSessionSummary> {
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

    const existingSession = await this.cashRegisterSessionRepository.findOpenByRegisterId(
      input.cashRegisterId,
    );
    if (existingSession) {
      throw new CashRegisterSessionAlreadyOpenError(input.cashRegisterId);
    }

    const openedAt = new Date();
    const session = CashRegisterSession.open({
      id: crypto.randomUUID(),
      cashRegisterId: input.cashRegisterId,
      openingFloatAmount: input.openingFloatAmount,
      openedAt,
      openedByUserId: input.actorId,
      openingNotes: input.openingNotes,
    });
    const movement = CashMovement.record({
      id: crypto.randomUUID(),
      cashRegisterSessionId: session.getId(),
      cashRegisterId: input.cashRegisterId,
      movementType: "opening_float",
      direction: "inbound",
      amount: input.openingFloatAmount,
      reasonCode: "opening_float",
      notes: input.openingNotes,
      occurredAt: openedAt,
      performedByUserId: input.actorId,
    });

    await this.cashRegisterSessionRepository.save(session);
    await this.cashMovementRepository.append(movement);

    return toCashRegisterSessionSummary(session, this.actorAccessRepository);
  }
}
