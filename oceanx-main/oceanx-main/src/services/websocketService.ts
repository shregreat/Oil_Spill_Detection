import type { Alert, ConnectionState, Incident } from '@/lib/types';
import { ALERTS } from '@/lib/mock/alerts';
import { INCIDENTS } from '@/lib/mock/incidents';
import { WS_URL, USE_MOCKS } from './apiClient';

/**
 * Realtime transport abstraction.
 *
 * The UI subscribes to typed events here instead of talking to a socket, so the
 * mock driver below can be swapped for a real WebSocket/SSE connection without
 * touching any component. The mock replays a fixed, scripted sequence - it never
 * produces random values, so the interface stays stable between refreshes.
 */

export type StreamEvent =
  | { type: 'connection'; state: ConnectionState }
  | { type: 'alert'; payload: Alert }
  | { type: 'incident_updated'; payload: Incident }
  | { type: 'ais_tick'; payload: { messageRate: number; receivedAt: string } }
  | { type: 'pipeline'; payload: { sceneId: string; stage: string } };

type Listener = (event: StreamEvent) => void;

const SCRIPT: { afterMs: number; event: StreamEvent }[] = [
  { afterMs: 900, event: { type: 'connection', state: 'LIVE' } },
  { afterMs: 4200, event: { type: 'ais_tick', payload: { messageRate: 1284, receivedAt: '2026-09-12T09:41:00.000Z' } } },
  { afterMs: 9000, event: { type: 'pipeline', payload: { sceneId: 'S1A-IW-20260912T0918', stage: 'detection' } } },
  { afterMs: 14000, event: { type: 'alert', payload: ALERTS[0] } },
  { afterMs: 21000, event: { type: 'incident_updated', payload: INCIDENTS[0] } }
];

class MockRealtimeDriver {
  private listeners = new Set<Listener>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private state: ConnectionState = 'OFFLINE';

  get connectionState() {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener({ type: 'connection', state: this.state });

    if (this.listeners.size === 1) this.connect();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.disconnect();
    };
  }

  private emit(event: StreamEvent) {
    if (event.type === 'connection') this.state = event.state;
    this.listeners.forEach((l) => l(event));
  }

  private connect() {
    this.emit({ type: 'connection', state: 'CONNECTING' });
    SCRIPT.forEach(({ afterMs, event }) => {
      this.timers.push(setTimeout(() => this.emit(event), afterMs));
    });
  }

  private disconnect() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.state = 'OFFLINE';
  }

  /** Used by the connection indicator to let operators force a reconnect. */
  reconnect() {
    this.disconnect();
    if (this.listeners.size > 0) this.connect();
  }
}

const driver = new MockRealtimeDriver();

export const websocketService = {
  url: WS_URL,
  isMock: USE_MOCKS,
  subscribe: (listener: Listener) => driver.subscribe(listener),
  reconnect: () => driver.reconnect(),
  get state() {
    return driver.connectionState;
  }
};
