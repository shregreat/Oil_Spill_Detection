'use client';

import { useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button, ToggleChip } from '@/components/ui/Button';
import { InlineNotice } from '@/components/ui/States';
import { MAP_LAYERS } from '@/lib/mapLayers';
import { DEFAULT_LAYER_STATE } from '@/lib/constants';
import { USE_MOCKS } from '@/services';

export default function SettingsPage() {
  const [minConfidence, setMinConfidence] = useState(0.6);
  const [autoOpenIncidents, setAutoOpenIncidents] = useState(true);
  const [units, setUnits] = useState<'metric' | 'nautical'>('metric');
  const [refreshMin, setRefreshMin] = useState(5);
  const [defaultLayers, setDefaultLayers] = useState({ ...DEFAULT_LAYER_STATE });
  const [channels, setChannels] = useState({ email: true, sms: false, webhook: true });
  const [retentionDays, setRetentionDays] = useState(180);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3200);
  };

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Settings"
        description="Operator preferences for detection thresholds, alerting, map defaults and data retention."
        actions={
          <Button size="sm" variant="primary" onClick={save}>
            <Save className="h-3.5 w-3.5" />
            Save preferences
          </Button>
        }
      />

      {saved && <InlineNotice tone="success">Preferences saved locally. They will persist to the backend once connected.</InlineNotice>}

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Detection" subtitle="Thresholds applied to incoming candidates">
          <div className="space-y-4">
            <label className="block">
              <span className="label-xs">Minimum confidence to open an incident</span>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-deep accent-cyan-400"
                />
                <span className="w-12 font-mono text-xs text-ink">{Math.round(minConfidence * 100)}%</span>
              </div>
            </label>

            <ToggleChip active={autoOpenIncidents} onClick={() => setAutoOpenIncidents((v) => !v)}>
              Auto-open incidents above threshold
            </ToggleChip>

            <label className="block">
              <span className="label-xs">Dashboard refresh interval (minutes)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={refreshMin}
                onChange={(e) => setRefreshMin(Number(e.target.value))}
                className="input mt-1.5"
              />
            </label>
          </div>
        </Panel>

        <Panel title="Notifications" subtitle="Where alerts are delivered">
          <div className="space-y-2">
            {(['email', 'sms', 'webhook'] as const).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-lg border border-line/70 bg-deep/50 px-3 py-2"
              >
                <span className="text-xs capitalize text-ink">{key}</span>
                <input
                  type="checkbox"
                  checked={channels[key]}
                  onChange={() => setChannels((c) => ({ ...c, [key]: !c[key] }))}
                  className="h-4 w-4 rounded border-line bg-deep accent-cyan-400"
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Units and display" subtitle="Applied across panels and popups">
          <div className="flex flex-wrap gap-1.5">
            <ToggleChip active={units === 'metric'} onClick={() => setUnits('metric')}>
              Metric (km, m/s)
            </ToggleChip>
            <ToggleChip active={units === 'nautical'} onClick={() => setUnits('nautical')}>
              Nautical (nm, kn)
            </ToggleChip>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Data retention: keep processed scenes and AIS archives for{' '}
            <span className="font-mono text-ink">{retentionDays}</span> days.
          </p>
          <input
            type="range"
            min={30}
            max={730}
            step={30}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-deep accent-cyan-400"
          />
        </Panel>

        <Panel title="Default map layers" subtitle="Layers enabled when a map first loads">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {MAP_LAYERS.map((layer) => (
              <label
                key={layer.id}
                className="flex items-center gap-2 rounded-lg border border-line/70 bg-deep/50 px-2.5 py-1.5"
              >
                <input
                  type="checkbox"
                  checked={defaultLayers[layer.id]}
                  onChange={() => setDefaultLayers((l) => ({ ...l, [layer.id]: !l[layer.id] }))}
                  className="h-3.5 w-3.5 rounded border-line bg-deep accent-cyan-400"
                />
                <span className="truncate text-[11px] text-ink">{layer.label}</span>
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Integration" subtitle="Backend connection" className="xl:col-span-2">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-3.5 w-3.5 text-accent" />
            <p className="text-[11px] text-muted">
              Data mode:{' '}
              <span className="font-mono text-ink">{USE_MOCKS ? 'MOCK SERVICES' : 'LIVE BACKEND'}</span>. Set{' '}
              <span className="font-mono text-ink">NEXT_PUBLIC_USE_MOCKS=false</span> and{' '}
              <span className="font-mono text-ink">NEXT_PUBLIC_API_BASE_URL</span> to switch the whole application to a
              real API without UI changes.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
