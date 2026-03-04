import type { CashMovement } from "../entities/CashMovement";

export interface CashMovementRepository {
  append(movement: CashMovement): Promise<void>;
  listBySessionId(sessionId: string): Promise<readonly CashMovement[]>;
}
