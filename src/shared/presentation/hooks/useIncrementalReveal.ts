"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface UseIncrementalRevealOptions<T> {
  readonly items: readonly T[];
  readonly initialCount: number;
  readonly step: number;
  readonly resetKey: string;
}

interface UseIncrementalRevealResult<T> {
  readonly visibleItems: readonly T[];
  readonly hasMore: boolean;
  readonly visibleCount: number;
  readonly loadMore: () => void;
}

export function useIncrementalReveal<T>({
  items,
  initialCount,
  step,
  resetKey,
}: UseIncrementalRevealOptions<T>): UseIncrementalRevealResult<T> {
  const safeInitialCount = Math.max(1, initialCount);
  const safeStep = Math.max(1, step);
  const [visibleCount, setVisibleCount] = useState<number>(safeInitialCount);

  useEffect(() => {
    setVisibleCount(safeInitialCount);
  }, [resetKey, safeInitialCount]);

  const hasMore = visibleCount < items.length;

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(items.length, current + safeStep));
  }, [items.length, safeStep]);

  return {
    visibleItems,
    hasMore,
    visibleCount,
    loadMore,
  };
}
