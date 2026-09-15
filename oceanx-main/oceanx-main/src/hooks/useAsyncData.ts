'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  isEmpty: boolean;
  refetch: () => void;
}

/**
 * Thin data-fetching hook used by every page so that loading / empty / error /
 * success states are handled consistently. It only ever talks to the service
 * layer, never to a transport directly.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { isEmpty?: (data: T) => boolean } = {}
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);
  const emptyCheck = options.isEmpty;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    loader()
      .then((result) => {
        if (cancelled || !mounted.current) return;
        setData(result);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled || !mounted.current) return;
        setError(err instanceof Error ? err.message : 'Unexpected error');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  const isEmpty =
    status === 'success' &&
    data !== null &&
    (emptyCheck ? emptyCheck(data) : Array.isArray(data) ? data.length === 0 : false);

  return { data, status, error, isEmpty, refetch };
}
