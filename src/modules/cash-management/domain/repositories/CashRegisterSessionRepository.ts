import type { CashRegisterSession } from "../entities/CashRegisterSession";

export interface CashRegisterSessionRepository {
  findById(id: string): Promise<CashRegisterSession | null>;
  findOpenByRegisterId(registerId: string): Promise<CashRegisterSession | null>;
  save(session: CashRegisterSession): Promise<void>;
}
