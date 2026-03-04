"use client";

import type { LucideIcon } from "lucide-react";
import { LockKeyhole, ShieldAlert } from "lucide-react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";

import { useActorSession } from "../context/ActorSessionContext";

interface WorkspaceBlockedStateProps {
  readonly title: string;
  readonly description: string;
  readonly icon?: LucideIcon;
}

export function WorkspaceBlockedState({
  title,
  description,
  icon: Icon = ShieldAlert,
}: WorkspaceBlockedStateProps): JSX.Element {
  const { messages } = useI18n();
  const { currentActor, canSwitchActor, openOperatorSelector } = useActorSession();

  return (
    <section className="min-w-0 bg-[#f7f7f8] p-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:p-6">
      <article className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-[58rem] items-center justify-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:px-8 md:py-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Icon className="size-8" aria-hidden />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {messages.accessControl.blockedEyebrow}
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 md:text-[2.4rem]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-[40rem] text-base text-slate-600">
            {description}
          </p>
          <div className="mx-auto mt-6 flex max-w-[28rem] flex-col items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-700">
              <LockKeyhole className="size-4 text-slate-400" aria-hidden />
              {messages.accessControl.currentOperatorContext(
                currentActor?.displayName ?? messages.accessControl.unknownOperator,
              )}
            </p>
            {canSwitchActor ? (
              <button
                type="button"
                onClick={openOperatorSelector}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)]"
              >
                {messages.accessControl.changeOperatorAction}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
