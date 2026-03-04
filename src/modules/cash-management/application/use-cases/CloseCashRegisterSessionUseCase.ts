import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import {
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import {
  DEFAULT_CASH_REGISTER_DISCREPANCY_TOLERANCE_AMOUNT,
  evaluateCashRegisterCloseoutDecision,
} from "../../domain/services/CashRegisterCloseoutPolicy";
import { toCashRegisterSessionSummary, type CashRegisterSessionSummary } from "../mappers/toCashRegisterSessionSummary";

export interface CloseCashRegisterSessionUseCaseInput {
  readonly sessionId: string;
  readonly countedClosingAmount: number;
  readonly closingNotes?: string;
  readonly actorId: string;
  readonly accessibleRegisterIds?: readonly string[];
  readonly canApproveDiscrepancyClose: boolean;
  readonly discrepancyToleranceAmount?: number;
}

export class CloseCashRegisterSessionUseCase {
  constructor(
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: CloseCashRegisterSessionUseCaseInput,
  ): Promise<CashRegisterSessionSummary> {
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

    const closeoutDecision = evaluateCashRegisterCloseoutDecision({
      expectedBalanceAmount: session.getExpectedBalanceAmount(),
      countedClosingAmount: input.countedClosingAmount,
      discrepancyToleranceAmount:
        input.discrepancyToleranceAmount ??
        DEFAULT_CASH_REGISTER_DISCREPANCY_TOLERANCE_AMOUNT,
      canOverrideDiscrepancy: input.canApproveDiscrepancyClose,
    });
    const now = new Date();

    const closedSession = closeoutDecision.requiresSupervisorReview
      ? session.markClosingReviewRequired({
          countedClosingAmount: input.countedClosingAmount,
          closeoutSubmittedAt: now,
          closeoutSubmittedByUserId: input.actorId,
          closingNotes: input.closingNotes,
        })
      : session.close({
          countedClosingAmount: input.countedClosingAmount,
          closeoutSubmittedAt: now,
          closeoutSubmittedByUserId: input.actorId,
          closedAt: now,
          closedByUserId: input.actorId,
          closingNotes: input.closingNotes,
          discrepancyApprovedAt: closeoutDecision.isOutsideTolerance ? now : undefined,
          discrepancyApprovedByUserId: closeoutDecision.isOutsideTolerance
            ? input.actorId
            : undefined,
        });

    await this.cashRegisterSessionRepository.save(closedSession);

    return toCashRegisterSessionSummary(closedSession, this.actorAccessRepository);
  }
}
