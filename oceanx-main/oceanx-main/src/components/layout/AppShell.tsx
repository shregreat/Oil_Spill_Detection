'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useConnection } from '@/hooks/useConnection';
import { alertService, authService } from '@/services';
import { INCIDENTS } from '@/lib/mock/incidents';

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { state, eventCount, reconnect } = useConnection();
  const [user, setUser] = useState({ name: 'Cdr. Arjun Nair', role: 'Administrator' });

  useEffect(() => {
    const session = authService.current();
    if (session) setUser({ name: session.user.name, role: session.user.role });
  }, []);

  const badges = {
    alerts: alertService.unacknowledgedCount(),
    incidents: INCIDENTS.filter((i) => ['active', 'investigating'].includes(i.status)).length
  };

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-abyss">
      {/* Desktop navigation */}
      <div className="hidden xl:block">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          badges={badges}
          onLogout={handleLogout}
        />
      </div>

      {/* Tablet / mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-abyss/70 backdrop-blur-sm xl:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 xl:hidden"
            >
              <Sidebar
                drawer
                collapsed={false}
                onToggleCollapsed={() => setDrawerOpen(false)}
                badges={badges}
                onNavigate={() => setDrawerOpen(false)}
                onLogout={handleLogout}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenNav={() => setDrawerOpen(true)}
          connection={state}
          eventCount={eventCount}
          onReconnect={reconnect}
          alertCount={badges.alerts}
          userName={user.name}
          userRole={user.role}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
