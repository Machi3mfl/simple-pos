import type { ActorAccessRepository } from "@/modules/access-control/domain/repositories/ActorAccessRepository";

export async function resolveActorDisplayName(
  actorAccessRepository: ActorAccessRepository,
  actorId: string | undefined,
): Promise<string | undefined> {
  if (!actorId) {
    return undefined;
  }

  try {
    const actorAccess = await actorAccessRepository.findByUserId(actorId);
    return actorAccess?.user.getDisplayName();
  } catch {
    return undefined;
  }
}
