"use client";

import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/infrastructure/i18n/I18nProvider";
import {
  flushOfflineSyncQueue,
  getOfflineSyncQueueStorageKey,
  getPendingOfflineSyncCount,
} from "../offline/offlineSyncQueue";

interface SyncResult {
  readonly synced: number;
  readonly failed: number;
  readonly pending: number;
}

export function OfflineSyncPanel(): JSX.Element {
  const { messages } = useI18n();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const refreshPendingCount = useCallback((): void => {
    setPendingCount(getPendingOfflineSyncCount());
  }, []);

  const runSync = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      const result = await flushOfflineSyncQueue();
      setLastResult(result);
      refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    refreshPendingCount();

    const onOnline = (): void => {
      setIsOnline(true);
      refreshPendingCount();
      void runSync();
    };

    const onOffline = (): void => {
      setIsOnline(false);
      refreshPendingCount();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshPendingCount, runSync]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)] lg:p-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {messages.sync.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {messages.sync.subtitle}
        </p>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {messages.common.labels.network}
          </p>
          <p className={isOnline ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-rose-700"}>
            {isOnline ? messages.common.states.online : messages.common.states.offline}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {messages.common.labels.pendingEvents}
          </p>
          <p className="text-sm font-semibold text-slate-900">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {messages.common.labels.queueStorageKey}
          </p>
          <p className="text-xs font-semibold text-slate-900">
            {getOfflineSyncQueueStorageKey()}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void runSync();
          }}
          disabled={isSyncing}
          className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.35)] disabled:bg-slate-400"
        >
          {isSyncing ? messages.common.states.syncing : messages.common.actions.retryOfflineSync}
        </button>
      </div>

      {lastResult ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
          <p>
            {messages.sync.synced}: <strong>{lastResult.synced}</strong>
          </p>
          <p>
            {messages.sync.failed}: <strong>{lastResult.failed}</strong>
          </p>
          <p>
            {messages.sync.pending}: <strong>{lastResult.pending}</strong>
          </p>
        </div>
      ) : null}
    </article>
  );
}
