"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getSupabaseBrowserClient } from "@/infrastructure/config/supabase";

import type {
  ActorSessionResolutionSource,
  CurrentActorSnapshot,
  SelectableActorSummary,
} from "../../domain/types/PermissionSnapshot";
import { OperatorSelectorDialog } from "../components/OperatorSelectorDialog";

type ActorSessionStatus = "loading" | "ready" | "error";

interface ActorSessionContextValue {
  readonly status: ActorSessionStatus;
  readonly currentActor: CurrentActorSnapshot["actor"] | null;
  readonly permissionSnapshot: CurrentActorSnapshot["permissionSnapshot"] | null;
  readonly sessionSource: ActorSessionResolutionSource | null;
  readonly isAuthenticated: boolean;
  readonly canSwitchActor: boolean;
  readonly errorMessage: string | null;
  readonly openOperatorSelector: () => void;
  readonly refreshActorSession: () => Promise<CurrentActorSnapshot | null>;
  readonly switchActor: (userId: string) => Promise<void>;
  readonly clearAssumedActor: () => Promise<void>;
  readonly signOut: () => Promise<void>;
}

interface ActorSessionProviderProps {
  readonly children: ReactNode;
}

interface ApiErrorPayload {
  readonly message?: string;
}

interface SelectableActorsResponse {
  readonly items: readonly SelectableActorSummary[];
}

function resolveApiMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof (payload as ApiErrorPayload).message === "string"
  ) {
    return (payload as ApiErrorPayload).message as string;
  }

  return fallback;
}

const ActorSessionContext = createContext<ActorSessionContextValue | null>(null);

function isAuthenticatedSessionSource(
  sessionSource: ActorSessionResolutionSource | null,
): boolean {
  return (
    sessionSource === "authenticated" ||
    sessionSource === "authenticated_unmapped"
  );
}

export function ActorSessionProvider({
  children,
}: ActorSessionProviderProps): JSX.Element {
  const [status, setStatus] = useState<ActorSessionStatus>("loading");
  const [snapshot, setSnapshot] = useState<CurrentActorSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [selectableActors, setSelectableActors] = useState<
    readonly SelectableActorSummary[]
  >([]);
  const [isLoadingActors, setIsLoadingActors] = useState<boolean>(false);
  const [selectorError, setSelectorError] = useState<string | null>(null);
  const [isSwitchingActor, setIsSwitchingActor] = useState<boolean>(false);

  const refreshActorSession = useCallback(
    async (): Promise<CurrentActorSnapshot | null> => {
      setStatus((current) => (current === "ready" ? current : "loading"));
      setErrorMessage(null);

      try {
        const response = await fetch("/api/v1/me", {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          cache: "no-store",
        });
        const payload = (await response.json()) as
          | CurrentActorSnapshot
          | ApiErrorPayload;

        if (!response.ok) {
          throw new Error(
            resolveApiMessage(payload, "No se pudo cargar el operador actual."),
          );
        }

        const currentSnapshot = payload as CurrentActorSnapshot;
        setSnapshot(currentSnapshot);
        setStatus("ready");
        return currentSnapshot;
      } catch (error: unknown) {
        setSnapshot(null);
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el operador actual.",
        );
        return null;
      }
    },
    [],
  );

  const loadSelectableActors = useCallback(async (): Promise<void> => {
    setIsLoadingActors(true);
    setSelectorError(null);

    try {
      const response = await fetch("/api/v1/app-users", {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        cache: "no-store",
      });
      const payload = (await response.json()) as SelectableActorsResponse | ApiErrorPayload;

      if (!response.ok) {
        throw new Error(
          resolveApiMessage(payload, "No se pudieron cargar los operadores."),
        );
      }

      setSelectableActors((payload as SelectableActorsResponse).items);
    } catch (error: unknown) {
      setSelectorError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los operadores.",
      );
    } finally {
      setIsLoadingActors(false);
    }
  }, []);

  useEffect(() => {
    void refreshActorSession();
  }, [refreshActorSession]);

  useEffect(() => {
    const browserClient = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = browserClient.auth.onAuthStateChange(() => {
      void refreshActorSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshActorSession]);

  const openOperatorSelector = useCallback((): void => {
    if (
      !snapshot?.session.canAssumeUserBridge ||
      isAuthenticatedSessionSource(snapshot.session.resolutionSource)
    ) {
      return;
    }

    setIsSelectorOpen(true);
    void loadSelectableActors();
  }, [
    loadSelectableActors,
    snapshot?.session.canAssumeUserBridge,
    snapshot?.session.resolutionSource,
  ]);

  const switchActor = useCallback(
    async (userId: string): Promise<void> => {
      setIsSwitchingActor(true);
      setSelectorError(null);

      try {
        const response = await fetch("/api/v1/me/assume-user", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({ userId }),
        });
        const payload = (await response.json()) as
          | { readonly actorId: string }
          | ApiErrorPayload;

        if (!response.ok) {
          throw new Error(
            resolveApiMessage(payload, "No se pudo cambiar el operador."),
          );
        }

        await refreshActorSession();
        setIsSelectorOpen(false);
      } catch (error: unknown) {
        setSelectorError(
          error instanceof Error
            ? error.message
            : "No se pudo cambiar el operador.",
        );
      } finally {
        setIsSwitchingActor(false);
      }
    },
    [refreshActorSession],
  );

  const clearAssumedActor = useCallback(async (): Promise<void> => {
    await fetch("/api/v1/me/assume-user", {
      method: "DELETE",
      headers: {
        accept: "application/json",
      },
    });

    await refreshActorSession();
  }, [refreshActorSession]);

  const signOut = useCallback(async (): Promise<void> => {
    setErrorMessage(null);

    try {
      await fetch("/api/v1/me/assume-user", {
        method: "DELETE",
        headers: {
          accept: "application/json",
        },
      });

      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) {
        throw new Error(error.message);
      }

      await refreshActorSession();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cerrar la sesión actual.";
      setErrorMessage(
        message,
      );
      throw new Error(message);
    }
  }, [refreshActorSession]);

  const value = useMemo<ActorSessionContextValue>(
    () => ({
      status,
      currentActor: snapshot?.actor ?? null,
      permissionSnapshot: snapshot?.permissionSnapshot ?? null,
      sessionSource: snapshot?.session.resolutionSource ?? null,
      isAuthenticated: isAuthenticatedSessionSource(
        snapshot?.session.resolutionSource ?? null,
      ),
      canSwitchActor:
        (snapshot?.session.canAssumeUserBridge ?? false) &&
        !isAuthenticatedSessionSource(snapshot?.session.resolutionSource ?? null),
      errorMessage,
      openOperatorSelector,
      refreshActorSession,
      switchActor,
      clearAssumedActor,
      signOut,
    }),
    [
      status,
      snapshot,
      errorMessage,
      openOperatorSelector,
      refreshActorSession,
      switchActor,
      clearAssumedActor,
      signOut,
    ],
  );

  return (
    <ActorSessionContext.Provider value={value}>
      {children}
      <OperatorSelectorDialog
        isOpen={isSelectorOpen}
        actors={selectableActors}
        currentActorId={snapshot?.actor.actorId}
        isLoading={isLoadingActors}
        isSubmitting={isSwitchingActor}
        errorMessage={selectorError}
        onClose={() => setIsSelectorOpen(false)}
        onRetryLoad={() => {
          void loadSelectableActors();
        }}
        onSelectActor={(userId) => {
          void switchActor(userId);
        }}
      />
    </ActorSessionContext.Provider>
  );
}

export function useActorSession(): ActorSessionContextValue {
  const value = useContext(ActorSessionContext);
  if (!value) {
    throw new Error("useActorSession debe usarse dentro de ActorSessionProvider.");
  }

  return value;
}
