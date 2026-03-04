import type { AppUser } from "../entities/AppUser";

export interface ActorAccessRecord {
  readonly user: AppUser;
  readonly roleCodes: readonly string[];
  readonly roleNames: readonly string[];
  readonly permissionCodes: readonly string[];
  readonly assignedRegisterIds: readonly string[];
}

export interface ActorAccessRepository {
  findByUserId(userId: string): Promise<ActorAccessRecord | null>;
  findByAuthUserId(authUserId: string): Promise<ActorAccessRecord | null>;
  findDefaultActor(): Promise<ActorAccessRecord | null>;
  listActiveActors(): Promise<readonly ActorAccessRecord[]>;
}
