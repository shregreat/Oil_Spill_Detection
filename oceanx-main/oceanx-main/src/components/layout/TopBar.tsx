'use client';

import Link from 'next/link';
import { Bell, Menu, Search, ShieldCheck } from 'lucide-react';
import type { ConnectionState } from '@/lib/types';
import { APP_TAGLINE } from '@/lib/constants';
import { DEMO_NOW, formatDateTime } from '@/lib/utils';
import { ConnectionIndicator } from './ConnectionIndicator';

export function TopBar({
  onOpenNav,
  connection,
  eventCount,
  onReconnect,
  alertCount,
  userName,
  userRole
}: {
  onOpenNav: () => void;
  connection: ConnectionState;
  eventCount: number;
  onReconnect: () => void;
  alertCount: number;
  userName: string;
  userRole: string;
}) {
  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line/80 bg-deep/80 px-3 backdrop-blur lg:px-4">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-muted transition-colors hover:text-accent focus-ring xl:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="hidden min-w-0 md:block">
        <p className="truncate text-xs font-semibold tracking-tight text-ink">Maritime Command Centre</p>
        <p className="truncate text-[10px] uppercase tracking-[0.14em] text-muted">{APP_TAGLINE}</p>
      </div>

      <div className="relative ml-auto hidden max-w-xs flex-1 lg:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Search incidents, MMSI, scenes"
          className="input h-9 pl-8 text-xs"
          aria-label="Global search"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value.trim();
              if (value) window.location.href = `/incidents?q=${encodeURIComponent(value)}`;
            }
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2 lg:ml-0">
        <span className="hidden font-mono text-[11px] text-muted xl:inline">{formatDateTime(DEMO_NOW.toISOString())}</span>

        <ConnectionIndicator state={connection} eventCount={eventCount} onReconnect={onReconnect} />

        <Link
          href="/alerts"
          aria-label={`Alerts centre, ${alertCount} unacknowledged`}
          className="relative rounded-lg border border-line p-2 text-muted transition-colors hover:text-accent focus-ring"
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 font-mono text-[9px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-2 py-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
            {userName
              .split(' ')
              .map((p) => p[0])
              .slice(-2)
              .join('')}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="max-w-[120px] truncate text-[11px] font-medium text-ink">{userName}</p>
            <p className="flex items-center gap-1 text-[10px] text-muted">
              <ShieldCheck className="h-2.5 w-2.5" />
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
