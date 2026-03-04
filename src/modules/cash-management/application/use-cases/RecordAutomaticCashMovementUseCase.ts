import {
  CashMovement,
  type CashMovementType,
} from "../../domain/entities/CashMovement";
import {
  CashRegisterActiveSessionRequiredError,
  CashRegisterAssignmentError,
  CashRegisterSelectionRequiredError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashMovementRepository } from "../../domain/repositories/CashMovementRepository";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";

export interface RecordAutomaticCashMovementUseCaseInput {
  readonly movementType: "cash_sale" | "debt_payment_cash";
  readonly amount: number;
  readonly occurredAt: Date;
  readonly actorId: string;
  readonly cashRegisterId?: string;
  readonly accessibleRegisterIds?: readonly string[];
  readonly saleId?: string;
  readonly debtLedgerEntryId?: string;
}

function resolveTargetRegisterId(
  cashRegisterId: string | undefined,
  accessibleRegisterIds: readonly string[] | undefined,
): string {
  const requestedRegisterId = cashRegisterId?.trim();
  const availableRegisterIds = Array.from(new Set(accessibleRegisterIds ?? []));

  if (requestedRegisterId) {
    if (
      availableRegisterIds.length > 0 &&
      !availableRegisterIds.includes(requestedRegisterId)
    ) {
      throw new CashRegisterAssignmentError(requestedRegisterId);
    }

    return requestedRegisterId;
  }

  if (availableRegisterIds.length === 1) {
    return availableRegisterIds[0]!;
  }

  throw new CashRegisterSelectionRequiredError();
}

function resolveMovementDirection(
  movementType: RecordAutomaticCashMovementUseCaseInput["movementType"],
): "inbound" | "outbound" {
  if (movementType === "cash_sale" || movementType === "debt_payment_cash") {
    return "inbound";
  }

  const exhaustiveCheck: never = movementType;
  return exhaustiveCheck;
}

export class RecordAutomaticCashMovementUseCase {
  constructor(
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly cashMovementRepository: CashMovementRepository,
  ) {}

  async execute(input: RecordAutomaticCashMovementUseCaseInput): Promise<void> {
    const targetRegisterId = resolveTargetRegisterId(
      input.cashRegisterId,
      input.accessibleRegisterIds,
    );
    const session =
      await this.cashRegisterSessionRepository.findOpenByRegisterId(targetRegisterId);

    if (!session) {
      throw new CashRegisterActiveSessionRequiredError(targetRegisterId);
    }

    const direction = resolveMovementDirection(input.movementType);
    const updatedSession = session.applyMovement({
      direction,
      amount: input.amount,
    });
    const movementType: CashMovementType = input.movementType;
    const movement = CashMovement.record({
      id: crypto.randomUUID(),
      cashRegisterSessionId: session.getId(),
      cashRegisterId: session.getCashRegisterId(),
      movementType,
      direction,
      amount: input.amount,
      reasonCode: input.movementType,
      occurredAt: input.occurredAt,
      performedByUserId: input.actorId,
      saleId: input.saleId,
      debtLedgerEntryId: input.debtLedgerEntryId,
    });

    // Keeping the session snapshot and ledger append together avoids silent drawer drift
    // when checkout or debt collection succeeds but the cash session write only partially completes.
    await this.cashRegisterSessionRepository.save(updatedSession);

    try {
      await this.cashMovementRepository.append(movement);
    } catch (error: unknown) {
      await this.cashRegisterSessionRepository.save(session);
      throw error;
    }
  }
}
