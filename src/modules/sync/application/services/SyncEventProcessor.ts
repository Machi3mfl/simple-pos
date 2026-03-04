import type { ProcessSyncEventInput } from "../use-cases/ProcessSyncEventsBatchUseCase";

export interface SyncEventProcessor {
  supports(eventType: string): boolean;
  process(event: ProcessSyncEventInput): Promise<void>;
}
