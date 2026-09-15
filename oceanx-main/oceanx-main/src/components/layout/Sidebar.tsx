'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Anchor, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { NAV_GROUPS, NAV_ITEMS } from '@/lib/navigation';
import { APP_NAME, PS_REFERENCE } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  badges?: { alerts?: number; incidents?: number };
  onNavigate?: () => void;
  onLogout?: () => void;
  /** Mobile / tablet drawer mode renders a close button instead of collapse. */
  drawer?: boolean;
}

export function Sidebar({ collapsed, onToggleCollapsed, badges, onNavigate, onLogout, drawer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-line/80 bg-deep/95 backdrop-blur transition-[width] duration-300',
        collapsed && !drawer ? 'w-[68px]' : 'w-64'
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-line/80 px-3 py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/40 bg-accent/10">
          <Anchor className="h-4 w-4 text-accent" />
        </span>
        {(!collapsed || drawer) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-ink">{APP_NAME}</p>
            <p className="truncate text-[10px] uppercase tracking-[0.14em] text-muted">{PS_REFERENCE}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={drawer ? 'Close navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="ml-auto rounded-lg p-1.5 text-muted transition-colors hover:text-accent focus-ring"
        >
          {drawer ? (
            <X className="h-4 w-4" />
          ) : collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group}>
            {(!collapsed || drawer) && <p className="label-xs px-2 pb-1.5">{group}</p>}
            <ul className="space-y-0.5">
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed && !drawer ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors focus-ring',
                        active ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-panel2/60 hover:text-ink'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {(!collapsed || drawer) && <span className="truncate">{item.label}</span>}
                      {(!collapsed || drawer) && typeof badge === 'number' && badge > 0 && (
                        <span className="ml-auto rounded-full bg-bad/20 px-1.5 font-mono text-[10px] text-rose-300">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line/80 p-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted transition-colors hover:bg-panel2/60 hover:text-ink focus-ring"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || drawer) && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
