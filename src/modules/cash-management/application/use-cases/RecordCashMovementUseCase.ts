import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import {
  CashMovement,
  type CashMovementDirection,
  type ManualCashMovementType,
} from "../../domain/entities/CashMovement";
import {
  CashManagementDomainError,
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashMovementRepository } from "../../domain/repositories/CashMovementRepository";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import {
  toCashRegisterSessionDetail,
  type CashRegisterSessionDetail,
} from "../mappers/toCashRegisterSessionDetail";

export interface RecordCashMovementUseCaseInput {
  readonly sessionId: string;
  readonly movementType: ManualCashMovementType;
  readonly amount: number;
  readonly direction?: CashMovementDirection;
  readonly notes?: string;
  readonly actorId: string;
  readonly accessibleRegisterIds?: readonly string[];
}

function resolveMovementDirection(
  movementType: ManualCashMovementType,
  requestedDirection: CashMovementDirection | undefined,
): CashMovementDirection {
  switch (movementType) {
    case "cash_paid_in":
      return "inbound";
    case "cash_paid_out":
    case "safe_drop":
      return "outbound";
    case "adjustment":
      if (!requestedDirection) {
        throw new CashManagementDomainError(
          "Para un ajuste manual debés indicar si suma o resta efectivo.",
        );
      }
      return requestedDirection;
    default:
      throw new CashManagementDomainError("Tipo de movimiento manual no soportado.");
  }
}

export class RecordCashMovementUseCase {
  constructor(
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly cashMovementRepository: CashMovementRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: RecordCashMovementUseCaseInput,
  ): Promise<CashRegisterSessionDetail> {
    const session = await this.cashRegisterSessionRepository.findById(input.sessionId);
    if (!session) {
      throw new CashRegisterSessionNotFoundError(input.sessionId);
    }

    const accessibleRegisterIds = new Set(input.accessibleRegisterIds ?? []);
    if (
      accessibleRegisterIds.size > 0 &&
      !accessibleRegisterIds.has(session.getCashRegisterId())
    ) {
      throw new CashRegisterAssignmentError(session.getCashRegisterId());
    }

    const direction = resolveMovementDirection(input.movementType, input.direction);
    const updatedSession = session.applyMovement({
      direction,
      amount: input.amount,
    });
    const movement = CashMovement.record({
      id: crypto.randomUUID(),
      cashRegisterSessionId: session.getId(),
      cashRegisterId: session.getCashRegisterId(),
      movementType: input.movementType,
      direction,
      amount: input.amount,
      reasonCode: input.movementType,
      notes: input.notes,
      occurredAt: new Date(),
      performedByUserId: input.actorId,
    });

    // Persisting the session snapshot first lets us compensate cleanly if movement insert fails,
    // avoiding orphan ledger rows that would be harder to reconcile later without transactions.
    await this.cashRegisterSessionRepository.save(updatedSession);

    try {
      await this.cashMovementRepository.append(movement);
    } catch (error: unknown) {
      await this.cashRegisterSessionRepository.save(session);
      throw error;
    }

    const movements = await this.cashMovementRepository.listBySessionId(session.getId());
    return toCashRegisterSessionDetail(
      updatedSession,
      movements,
      this.actorAccessRepository,
    );
  }
}
