export type AppUserKind = "human" | "system";

export interface AppUserProps {
  readonly id: string;
  readonly authUserId?: string;
  readonly displayName: string;
  readonly actorKind: AppUserKind;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export class AppUser {
  private readonly id: string;
  private readonly authUserId?: string;
  private readonly displayName: string;
  private readonly actorKind: AppUserKind;
  private readonly isActive: boolean;
  private readonly createdAt: Date;

  private constructor(props: AppUserProps) {
    this.id = props.id;
    this.authUserId = props.authUserId;
    this.displayName = props.displayName;
    this.actorKind = props.actorKind;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static create(props: AppUserProps): AppUser {
    return new AppUser(props);
  }

  getId(): string {
    return this.id;
  }

  getAuthUserId(): string | undefined {
    return this.authUserId;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  getActorKind(): AppUserKind {
    return this.actorKind;
  }

  isEnabled(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
