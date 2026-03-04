import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

import {
  CashRegisterAssignmentError,
  CashRegisterSessionNotFoundError,
} from "../../domain/errors/CashManagementDomainError";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";
import {
  toCashRegisterSessionSummary,
  type CashRegisterSessionSummary,
} from "../mappers/toCashRegisterSessionSummary";

export interface ApproveCashRegisterSessionCloseoutUseCaseInput {
  readonly sessionId: string;
  readonly actorId: string;
  readonly approvalNotes?: string;
  readonly accessibleRegisterIds?: readonly string[];
}

export class ApproveCashRegisterSessionCloseoutUseCase {
  constructor(
    private readonly cashRegisterSessionRepository: CashRegisterSessionRepository,
    private readonly actorAccessRepository: ActorAccessRepository,
  ) {}

  async execute(
    input: ApproveCashRegisterSessionCloseoutUseCaseInput,
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

    const approvedSession = session.approveDiscrepancyClose({
      approvedAt: new Date(),
      approvedByUserId: input.actorId,
      approvalNotes: input.approvalNotes,
    });

    await this.cashRegisterSessionRepository.save(approvedSession);

    return toCashRegisterSessionSummary(
      approvedSession,
      this.actorAccessRepository,
    );
  }
}
