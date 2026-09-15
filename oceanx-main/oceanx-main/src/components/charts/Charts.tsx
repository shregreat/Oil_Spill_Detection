'use client';

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { ForecastStep } from '@/lib/types';
import { cn, formatTime } from '@/lib/utils';

const AXIS = { stroke: '#41618a', fontSize: 10, tickLine: false } as const;
const GRID = { stroke: 'rgba(26,51,80,0.7)', strokeDasharray: '3 3' } as const;

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(7,20,38,0.96)',
    border: '1px solid rgba(34,211,238,0.35)',
    borderRadius: 10,
    fontSize: 11,
    color: '#e6f0fa'
  },
  labelStyle: { color: '#7e9bbd', fontSize: 10 }
} as const;

export function ChartFrame({
  title,
  subtitle,
  height = 220,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  height?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('panel p-4', className)}>
      <div className="mb-3">
        <p className="text-xs font-semibold text-ink">{title}</p>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as never}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AreaTrend({
  data,
  xKey,
  series
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
}) {
  return (
    <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
      <defs>
        {series.map((s) => (
          <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid {...GRID} />
      <XAxis dataKey={xKey} {...AXIS} />
      <YAxis {...AXIS} />
      <Tooltip {...TOOLTIP_STYLE} />
      {series.map((s) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.name}
          stroke={s.color}
          strokeWidth={1.8}
          fill={`url(#grad-${s.key})`}
        />
      ))}
    </AreaChart>
  );
}

export function LineTrend({
  data,
  xKey,
  series,
  timeAxis = false
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: { key: string; name: string; color: string; dashed?: boolean }[];
  timeAxis?: boolean;
}) {
  return (
    <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
      <CartesianGrid {...GRID} />
      <XAxis
        dataKey={xKey}
        {...AXIS}
        tickFormatter={timeAxis ? (v: string) => formatTime(v) : undefined}
        minTickGap={24}
      />
      <YAxis {...AXIS} />
      <Tooltip {...TOOLTIP_STYLE} labelFormatter={timeAxis ? (v) => formatTime(String(v)) : undefined} />
      <Legend wrapperStyle={{ fontSize: 10, color: '#7e9bbd' }} />
      {series.map((s) => (
        <Line
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.name}
          stroke={s.color}
          strokeWidth={1.8}
          strokeDasharray={s.dashed ? '4 4' : undefined}
          dot={false}
        />
      ))}
    </LineChart>
  );
}

export function BarSeries({
  data,
  xKey,
  series,
  colorByValue
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
  colorByValue?: (value: number) => string;
}) {
  return (
    <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
      <CartesianGrid {...GRID} vertical={false} />
      <XAxis dataKey={xKey} {...AXIS} interval={0} angle={0} />
      <YAxis {...AXIS} />
      <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(34,211,238,0.06)' }} />
      {series.map((s) => (
        <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={34}>
          {colorByValue &&
            data.map((row, i) => (
              <Cell key={i} fill={colorByValue(Number(row[s.key]))} />
            ))}
        </Bar>
      ))}
    </BarChart>
  );
}

/** Forecast area + uncertainty band per horizon. */
export function ForecastChart({ forecast, height = 220 }: { forecast: ForecastStep[]; height?: number }) {
  const data = forecast.map((f) => ({
    horizon: `+${f.horizonHours}h`,
    areaKm2: f.areaKm2,
    confidence: Math.round(f.confidence * 100),
    shorelineRisk: Math.round(f.shorelineRisk * 100)
  }));

  return (
    <ChartFrame title="Forecast spread and confidence" subtitle="Slick area, detector confidence and shoreline risk by horizon" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="grad-forecast-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="horizon" {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 10, color: '#7e9bbd' }} />
        <Area
          type="monotone"
          dataKey="areaKm2"
          name="Area (km\u00b2)"
          stroke="#22c55e"
          strokeWidth={1.8}
          fill="url(#grad-forecast-area)"
        />
        <Line type="monotone" dataKey="confidence" name="Confidence (%)" stroke="#22d3ee" strokeWidth={1.6} dot={false} />
        <Line
          type="monotone"
          dataKey="shorelineRisk"
          name="Shoreline risk (%)"
          stroke="#f97316"
          strokeWidth={1.6}
          strokeDasharray="4 4"
          dot={false}
        />
      </ComposedChart>
    </ChartFrame>
  );
}
