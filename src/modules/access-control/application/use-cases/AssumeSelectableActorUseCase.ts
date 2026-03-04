import type { ActorAccessRepository } from "../../domain/repositories/ActorAccessRepository";
import type { SelectableActorSummary } from "../../domain/types/PermissionSnapshot";

export class AssumeSelectableActorUseCase {
  constructor(private readonly actorAccessRepository: ActorAccessRepository) {}

  async execute(userId: string): Promise<SelectableActorSummary | null> {
    const actorAccess = await this.actorAccessRepository.findByUserId(userId);
    if (!actorAccess || !actorAccess.user.isEnabled()) {
      return null;
    }

    return {
      actorId: actorAccess.user.getId(),
      displayName: actorAccess.user.getDisplayName(),
      roleCodes: actorAccess.roleCodes,
      roleNames: actorAccess.roleNames,
      assignedRegisterIds: actorAccess.assignedRegisterIds,
    };
  }
}
