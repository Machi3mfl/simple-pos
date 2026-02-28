import { ProcessSyncEventsBatchUseCase } from "../../application/use-cases/ProcessSyncEventsBatchUseCase";
import { InMemorySyncEventRepository } from "../repositories/InMemorySyncEventRepository";

const syncEventRepository = new InMemorySyncEventRepository();

export const syncMockRuntime = {
  processSyncEventsBatchUseCase: new ProcessSyncEventsBatchUseCase(syncEventRepository),
};
