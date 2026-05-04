import { useEffect, useRef, useState, useMemo } from "react";

/**
 * Client-side incremental rendering for already-fetched lists.
 * Uses IntersectionObserver to load more items as the sentinel becomes visible.
 *
 * Combine with React Query: data já vem em cache, aqui só controlamos quanto
 * é renderizado por vez para manter a UI fluida em listas grandes.
 */
export function useInfiniteScroll<T>(items: T[], pageSize = 20) {
  const [count, setCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset count when underlying list shrinks (e.g. filter changes)
  useEffect(() => {
    if (count > items.length) setCount(Math.min(pageSize, items.length));
  }, [items.length, pageSize, count]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((c) => Math.min(c + pageSize, items.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  const visible = useMemo(() => items.slice(0, count), [items, count]);
  const hasMore = count < items.length;

  return { visible, hasMore, sentinelRef, total: items.length, loaded: visible.length };
}
