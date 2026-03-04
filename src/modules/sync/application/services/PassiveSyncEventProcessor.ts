import type { ProcessSyncEventInput } from "../use-cases/ProcessSyncEventsBatchUseCase";
import type { SyncEventProcessor } from "./SyncEventProcessor";

export class PassiveSyncEventProcessor implements SyncEventProcessor {
  private readonly supportedEventTypes: ReadonlySet<string>;

  constructor(eventTypes: readonly string[]) {
    this.supportedEventTypes = new Set(eventTypes);
  }

  supports(eventType: string): boolean {
    return this.supportedEventTypes.has(eventType);
  }

  async process(_event: ProcessSyncEventInput): Promise<void> {
    return Promise.resolve();
  }
}
