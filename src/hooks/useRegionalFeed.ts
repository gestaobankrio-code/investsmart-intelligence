import { useCallback, useEffect, useState } from "react";
import { fetchStateFeed, STATE_POLL_MS, type StateTrendsFeed } from "@/lib/state-trends";

export interface RegionalFeedState {
  feed: StateTrendsFeed | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRegionalFeed(): RegionalFeedState {
  const [feed, setFeed] = useState<StateTrendsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((previous) => previous + 1), []);

  useEffect(() => {
    let active = true;
    const fetchCurrent = async () => {
      if (!active) return;
      setLoading(true);
      try {
        const result = await fetchStateFeed();
        if (active) {
          setFeed(result);
          setError(null);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchCurrent();
    const interval = window.setInterval(() => void fetchCurrent(), STATE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [revision]);

  return { feed, loading, error, refresh };
}
