'use client';

import { useEffect, useState } from 'react';

/**
 * Reads a query parameter on the client.
 *
 * Deliberately avoids `useSearchParams` so client pages do not need a Suspense
 * boundary during prerendering, while still supporting deep links such as
 * `/ais?mmsi=636019887` and `/forecast?incident=INC-2026-0142`.
 */
export function useQueryParam(key: string): string | null {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key));
  }, [key]);

  return value;
}
