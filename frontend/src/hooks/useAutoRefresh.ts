import { useEffect, useRef, useCallback, useState } from 'react';

export function useAutoRefresh(
  fetchFn: () => Promise<void>,
  intervalMs: number = 30000,
  enabled: boolean = true
) {
  const fetchFnRef = useRef(fetchFn);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  fetchFnRef.current = fetchFn;

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchFnRef.current();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    refresh();

    const interval = setInterval(refresh, intervalMs);
    return () => clearInterval(interval);
  }, [refresh, intervalMs, enabled]);

  return { isRefreshing, lastUpdated, refresh };
}

export function useCountdown(seconds: number, onTick?: (remaining: number) => void) {
  const [remaining, setRemaining] = useState(seconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onTick?.(0);
          return seconds;
        }
        onTick?.(prev - 1);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, seconds, onTick]);

  return { remaining, isRunning, setIsRunning };
}
