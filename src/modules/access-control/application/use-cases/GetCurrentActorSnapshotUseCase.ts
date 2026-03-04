import { buildPermissionSnapshot } from "../../domain/services/buildPermissionSnapshot";
import type { ActorAccessRepository } from "../../domain/repositories/ActorAccessRepository";
import type { CurrentActorSnapshot } from "../../domain/types/PermissionSnapshot";

export interface GetCurrentActorSnapshotInput {
  readonly actorId?: string;
  readonly authUserId?: string;
}

export class GetCurrentActorSnapshotUseCase {
  constructor(private readonly actorAccessRepository: ActorAccessRepository) {}

  async execute(
    input: GetCurrentActorSnapshotInput,
  ): Promise<CurrentActorSnapshot | null> {
    const actorAccess =
      (input.authUserId
        ? await this.actorAccessRepository.findByAuthUserId(input.authUserId)
        : null) ??
      (input.actorId
        ? await this.actorAccessRepository.findByUserId(input.actorId)
        : null) ??
      (await this.actorAccessRepository.findDefaultActor());

    if (!actorAccess || !actorAccess.user.isEnabled()) {
      return null;
    }

    return {
      actor: {
        actorId: actorAccess.user.getId(),
        displayName: actorAccess.user.getDisplayName(),
        actorKind: actorAccess.user.getActorKind(),
        roleCodes: actorAccess.roleCodes,
        roleNames: actorAccess.roleNames,
        assignedRegisterIds: actorAccess.assignedRegisterIds,
      },
      permissionSnapshot: buildPermissionSnapshot(actorAccess),
    };
  }
}
