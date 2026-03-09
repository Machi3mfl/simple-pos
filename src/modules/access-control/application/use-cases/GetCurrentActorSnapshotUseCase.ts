import { buildPermissionSnapshot } from "../../domain/services/buildPermissionSnapshot";
import type { ActorAccessRepository } from "../../domain/repositories/ActorAccessRepository";
import type { CurrentActorSnapshot } from "../../domain/types/PermissionSnapshot";

export interface GetCurrentActorSnapshotInput {
  readonly actorId?: string;
  readonly authUserId?: string;
}

export type ResolvedActorSnapshot = Omit<CurrentActorSnapshot, "session">;

export class GetCurrentActorSnapshotUseCase {
  constructor(private readonly actorAccessRepository: ActorAccessRepository) {}

  async execute(
    input: GetCurrentActorSnapshotInput,
  ): Promise<ResolvedActorSnapshot | null> {
    let actorAccess = input.authUserId
      ? await this.actorAccessRepository.findByAuthUserId(input.authUserId)
      : null;

    if (!actorAccess && input.actorId) {
      actorAccess = await this.actorAccessRepository.findByUserId(input.actorId);
    }

    if (!actorAccess && !input.authUserId && !input.actorId) {
      actorAccess = await this.actorAccessRepository.findDefaultActor();
    }

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
