'use client';

import { useEffect, useState } from 'react';
import type { ConnectionState } from '@/lib/types';
import { websocketService, type StreamEvent } from '@/services';

/**
 * Subscribes to the realtime service and exposes the connection state plus the
 * most recent stream event. Backed by the scripted mock driver for now.
 */
export function useConnection() {
  const [state, setState] = useState<ConnectionState>('CONNECTING');
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const unsubscribe = websocketService.subscribe((event) => {
      if (event.type === 'connection') {
        setState(event.state);
        return;
      }
      setLastEvent(event);
      setEventCount((c) => c + 1);
    });
    return unsubscribe;
  }, []);

  return { state, lastEvent, eventCount, reconnect: () => websocketService.reconnect() };
}
