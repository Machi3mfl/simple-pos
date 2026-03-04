import type { ActorAccessRepository } from "../../domain/repositories/ActorAccessRepository";
import type { SelectableActorSummary } from "../../domain/types/PermissionSnapshot";

export class ListSelectableActorsUseCase {
  constructor(private readonly actorAccessRepository: ActorAccessRepository) {}

  async execute(): Promise<readonly SelectableActorSummary[]> {
    const actors = await this.actorAccessRepository.listActiveActors();

    return actors.map((actorAccess) => ({
      actorId: actorAccess.user.getId(),
      displayName: actorAccess.user.getDisplayName(),
      roleCodes: actorAccess.roleCodes,
      roleNames: actorAccess.roleNames,
      assignedRegisterIds: actorAccess.assignedRegisterIds,
    }));
  }
}
