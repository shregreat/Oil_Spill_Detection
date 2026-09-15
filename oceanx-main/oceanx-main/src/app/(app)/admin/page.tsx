'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { ErrorState, InlineNotice, LoadingState } from '@/components/ui/States';
import { useAsyncData } from '@/hooks/useAsyncData';
import { systemService } from '@/services';
import type { SystemUser } from '@/lib/types';
import { cn, relativeTime } from '@/lib/utils';

const ROLES: SystemUser['role'][] = ['Administrator', 'Analyst', 'Operator', 'Viewer'];

const STATUS_STYLES: Record<SystemUser['status'], string> = {
  active: 'border-ok/50 bg-ok/12 text-emerald-300',
  invited: 'border-sev-low/50 bg-sev-low/12 text-sky-300',
  suspended: 'border-bad/50 bg-bad/12 text-rose-300'
};

export default function AdminPage() {
  const { data, status, error, refetch } = useAsyncData(() => systemService.users(), []);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (data) setUsers(data);
  }, [data]);

  const changeRole = async (id: string, role: SystemUser['role']) => {
    const updated = await systemService.updateUserRole(id, role);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    setNotice(`${updated.name} is now ${role}.`);
  };

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Loading directory" rows={4} />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="p-4">
        <ErrorState description={error ?? undefined} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="User Management"
        description="Operators, analysts and observers with access to the command centre."
        actions={
          <Button size="sm" variant="primary" onClick={() => setNotice('Invitation flow opens once the backend is connected.')}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite operator
          </Button>
        }
      />

      {notice && <InlineNotice tone="info">{notice}</InlineNotice>}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard index={0} label="Total users" value={users.length} icon={ShieldCheck} />
        <MetricCard index={1} label="Active" value={users.filter((u) => u.status === 'active').length} tone="positive" />
        <MetricCard index={2} label="MFA enabled" value={users.filter((u) => u.mfaEnabled).length} />
        <MetricCard
          index={3}
          label="Suspended"
          value={users.filter((u) => u.status === 'suspended').length}
          tone="critical"
        />
      </div>

      <Panel title="Directory" subtitle="Change a role to update access immediately" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line/80">
                {['User', 'Organisation', 'Role', 'Status', 'MFA', 'Incidents', 'Last active'].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-line/50 hover:bg-panel2/40">
                  <td className="px-3 py-2">
                    <p className="text-xs font-medium text-ink">{user.name}</p>
                    <p className="text-[10px] text-muted">{user.email}</p>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted">{user.organisation}</td>
                  <td className="px-3 py-2">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value as SystemUser['role'])}
                      className="rounded-lg border border-line bg-deep px-2 py-1 text-[11px] text-ink focus-ring"
                      aria-label={`Role for ${user.name}`}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-[10px] capitalize',
                        STATUS_STYLES[user.status]
                      )}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    <span className={user.mfaEnabled ? 'text-emerald-300' : 'text-muted'}>
                      {user.mfaEnabled ? 'Enabled' : 'Off'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ink">{user.incidentsHandled}</td>
                  <td className="px-3 py-2 text-[11px] text-muted">{relativeTime(user.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
