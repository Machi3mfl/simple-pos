"use client";

import {
  LockKeyhole,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { getSupabaseBrowserClient } from "@/infrastructure/config/supabase";
import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import { useActorSession } from "@/modules/access-control/presentation/context/ActorSessionContext";
import { resolvePreferredWorkspaceId } from "@/modules/access-control/presentation/workspaceAccess";
import { workspacePathById } from "@/modules/sales/presentation/posWorkspace";

export function LoginPage(): JSX.Element {
  const { messages } = useI18n();
  const router = useRouter();
  const {
    status,
    sessionSource,
    permissionSnapshot,
    isAuthenticated,
    refreshActorSession,
  } = useActorSession();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const preferredWorkspaceId = useMemo(
    () => resolvePreferredWorkspaceId(permissionSnapshot),
    [permissionSnapshot],
  );

  useEffect(() => {
    if (
      status !== "ready" ||
      !preferredWorkspaceId ||
      !(isAuthenticated || sessionSource === "assumed_user")
    ) {
      return;
    }

    router.replace(workspacePathById[preferredWorkspaceId]);
  }, [isAuthenticated, preferredWorkspaceId, router, sessionSource, status]);

  const authenticatedWarning =
    sessionSource === "authenticated_unmapped"
      ? messages.accessControl.loginUnmappedProfile
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw new Error(messages.accessControl.loginInvalidCredentials);
      }

      await fetch("/api/v1/me/assume-user", {
        method: "DELETE",
        headers: {
          accept: "application/json",
        },
      });

      const snapshot = await refreshActorSession();
      if (!snapshot) {
        throw new Error(messages.accessControl.loginInvalidCredentials);
      }

      const nextWorkspaceId = resolvePreferredWorkspaceId(snapshot.permissionSnapshot);
      if (!nextWorkspaceId) {
        throw new Error(
          snapshot.session.resolutionSource === "authenticated_unmapped"
            ? messages.accessControl.loginUnmappedProfile
            : messages.accessControl.loginNoWorkspace,
        );
      }

      router.push(workspacePathById[nextWorkspaceId]);
      router.refresh();
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : messages.accessControl.loginInvalidCredentials,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#050812] via-[#091121] to-[#102443] px-6 py-10 text-white lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(63,141,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(9,115,85,0.18),transparent_30%)]" />
          <div className="relative mx-auto flex h-full max-w-[40rem] items-center justify-center">
            <div className="w-full max-w-[28rem] rounded-[2.2rem] border border-white/15 bg-white/5 px-8 py-10 text-center shadow-[0_28px_70px_rgba(2,6,23,0.45)] backdrop-blur-sm">
              <span className="mx-auto inline-flex size-20 items-center justify-center rounded-[1.8rem] bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-[2.2rem] font-bold text-white shadow-[0_16px_34px_rgba(23,104,232,0.42)]">
                S
              </span>
              <h1 className="mt-6 text-[2.8rem] leading-none font-semibold tracking-tight text-white lg:text-[3.4rem]">
                Simple POS
              </h1>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 lg:px-8">
          <div className="w-full max-w-[32rem] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_60px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <LockKeyhole className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Acceso
                </p>
                <h2 className="text-[2rem] leading-none font-semibold tracking-tight text-slate-950">
                  {messages.accessControl.loginTitle}
                </h2>
              </div>
            </div>

            {status === "ready" && isAuthenticated && preferredWorkspaceId ? (
              <div className="mt-6 rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {messages.accessControl.loginAuthenticatedHint}
              </div>
            ) : null}

            {authenticatedWarning ? (
              <div className="mt-6 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {authenticatedWarning}
              </div>
            ) : null}

            {formError ? (
              <div
                data-testid="login-error-message"
                className="mt-6 rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              >
                {formError}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.accessControl.loginEmailLabel}
                </span>
                <input
                  data-testid="login-email-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-14 w-full rounded-[1.35rem] border border-slate-200 px-4 text-base text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="operador@negocio.com"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  {messages.accessControl.loginPasswordLabel}
                </span>
                <input
                  data-testid="login-password-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-14 w-full rounded-[1.35rem] border border-slate-200 px-4 text-base text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="••••••••"
                  required
                />
              </label>

              <button
                data-testid="login-submit-button"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-14 w-full items-center justify-center rounded-[1.45rem] bg-gradient-to-b from-[#3f8dff] to-[#1768e8] text-base font-semibold text-white shadow-[0_16px_34px_rgba(23,104,232,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? messages.common.states.loading
                  : messages.accessControl.loginSubmitAction}
              </button>
            </form>

          </div>
        </section>
      </div>
    </main>
  );
}
