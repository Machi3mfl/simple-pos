"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseInfiniteScrollTriggerOptions {
  readonly enabled?: boolean;
  readonly hasMore: boolean;
  readonly isLoading: boolean;
  readonly onLoadMore: () => void | Promise<void>;
  readonly triggerKey?: string | number;
  readonly rootMargin?: string;
  readonly threshold?: number;
}

interface UseInfiniteScrollTriggerResult {
  readonly isObserverSupported: boolean;
  readonly setScrollRoot: (node: HTMLElement | null) => void;
  readonly setSentinel: (node: HTMLElement | null) => void;
}

export function useInfiniteScrollTrigger({
  enabled = true,
  hasMore,
  isLoading,
  onLoadMore,
  triggerKey,
  rootMargin = "320px 0px",
  threshold = 0,
}: UseInfiniteScrollTriggerOptions): UseInfiniteScrollTriggerResult {
  const isObserverSupported = typeof IntersectionObserver !== "undefined";
  const [scrollRoot, setScrollRootState] = useState<HTMLElement | null>(null);
  const [sentinel, setSentinelState] = useState<HTMLElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const isRunningRef = useRef<boolean>(false);
  const lastTriggeredKeyRef = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const setScrollRoot = useCallback((node: HTMLElement | null) => {
    setScrollRootState(node);
  }, []);

  const setSentinel = useCallback((node: HTMLElement | null) => {
    setSentinelState(node);
  }, []);

  useEffect(() => {
    if (!enabled || !hasMore) {
      lastTriggeredKeyRef.current = undefined;
    }
  }, [enabled, hasMore]);

  useEffect(() => {
    if (!isObserverSupported || !enabled || !hasMore || isLoading || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (
          !firstEntry?.isIntersecting ||
          isRunningRef.current ||
          lastTriggeredKeyRef.current === triggerKey
        ) {
          return;
        }

        lastTriggeredKeyRef.current = triggerKey;
        isRunningRef.current = true;
        void Promise.resolve(onLoadMoreRef.current()).finally(() => {
          isRunningRef.current = false;
        });
      },
      {
        root: scrollRoot,
        rootMargin,
        threshold,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    enabled,
    hasMore,
    isLoading,
    isObserverSupported,
    rootMargin,
    scrollRoot,
    sentinel,
    threshold,
    triggerKey,
  ]);

  return {
    isObserverSupported,
    setScrollRoot,
    setSentinel,
  };
}
