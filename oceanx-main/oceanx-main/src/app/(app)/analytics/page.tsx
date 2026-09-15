'use client';

import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { AreaTrend, BarSeries, ChartFrame, LineTrend } from '@/components/charts/Charts';
import { useAsyncData } from '@/hooks/useAsyncData';
import { incidentService, systemService } from '@/services';

export default function AnalyticsPage() {
  const { data, status, error, refetch } = useAsyncData(async () => {
    const [series, kpis, incidents] = await Promise.all([
      systemService.analytics(),
      systemService.analyticsKpis(),
      incidentService.list()
    ]);
    return { series, kpis, incidents };
  }, []);

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Aggregating analytics" rows={6} />
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="p-4">
        <ErrorState description={error ?? undefined} onRetry={refetch} />
      </div>
    );
  }

  const { series } = data;
  const driftIncident = data.incidents[0];

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Analytics"
        description="Detection performance, spill extent, environmental drivers and attribution outcomes across the last 30 days."
        actions={<BarChart3 className="h-4 w-4 text-muted" />}
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {data.kpis.map((kpi, i) => (
          <MetricCard key={kpi.label} index={i} label={kpi.label} value={kpi.value} delta={kpi.delta} hint={kpi.hint} deltaSuffix="vs prev." />
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <ChartFrame title="Spill area over time" subtitle="Daily detected slick area and incident count">
          <AreaTrend
            data={series.spillAreaOverTime}
            xKey="date"
            series={[
              { key: 'areaKm2', name: 'Area (km²)', color: '#22d3ee' },
              { key: 'incidents', name: 'Incidents', color: '#c026d3' }
            ]}
          />
        </ChartFrame>

        <ChartFrame title="Detection confidence distribution" subtitle="Candidates grouped by detector confidence">
          <BarSeries
            data={series.confidenceDistribution}
            xKey="bucket"
            series={[{ key: 'count', name: 'Candidates', color: '#22d3ee' }]}
            colorByValue={(v) => (v > 40 ? '#22c55e' : v > 20 ? '#f59e0b' : '#38bdf8')}
          />
        </ChartFrame>

        <ChartFrame title="Incident count by region" subtitle="Incidents and cumulative area">
          <BarSeries
            data={series.incidentsByRegion}
            xKey="region"
            series={[
              { key: 'incidents', name: 'Incidents', color: '#f97316' },
              { key: 'areaKm2', name: 'Area (km²)', color: '#1e6b8a' }
            ]}
          />
        </ChartFrame>

        <ChartFrame title="Vessel ranking scores" subtitle="Top responsibility scores across open investigations">
          <BarSeries
            data={series.topRankedVessels}
            xKey="name"
            series={[{ key: 'score', name: 'Score', color: '#f43f5e' }]}
            colorByValue={(v) => (v >= 75 ? '#f43f5e' : v >= 50 ? '#f97316' : '#f59e0b')}
          />
        </ChartFrame>

        <ChartFrame title="Wind and ocean conditions" subtitle="48-hour met-ocean history">
          <LineTrend
            timeAxis
            data={series.windCurrentConditions}
            xKey="hour"
            series={[
              { key: 'windMs', name: 'Wind (m/s)', color: '#fbbf24' },
              { key: 'waveM', name: 'Wave Hs (m)', color: '#38bdf8' },
              { key: 'currentMs', name: 'Current (m/s)', color: '#2dd4bf' }
            ]}
          />
        </ChartFrame>

        <ChartFrame title="Detection accuracy" subtitle="Weekly true vs false positives after review">
          <BarSeries
            data={series.detectionAccuracy}
            xKey="date"
            series={[
              { key: 'truePositives', name: 'True positives', color: '#22c55e' },
              { key: 'falsePositives', name: 'False positives', color: '#f43f5e' }
            ]}
          />
        </ChartFrame>

        <ChartFrame title="Suspect vessel speed" subtitle={`${driftIncident.suspects[0]?.name ?? 'Suspect'} vs fleet median`}>
          <LineTrend
            timeAxis
            data={series.vesselSpeedProfile}
            xKey="t"
            series={[
              { key: 'suspect', name: 'Suspect (kn)', color: '#f97316' },
              { key: 'fleetMedian', name: 'Fleet median (kn)', color: '#7e9bbd', dashed: true }
            ]}
          />
        </ChartFrame>

        <ChartFrame title="Suspect vessel course" subtitle="Reported course vs filed route">
          <LineTrend
            timeAxis
            data={series.vesselCourseProfile}
            xKey="t"
            series={[
              { key: 'suspect', name: 'Course (°)', color: '#22d3ee' },
              { key: 'expected', name: 'Filed route (°)', color: '#7e9bbd', dashed: true }
            ]}
          />
        </ChartFrame>

        <ChartFrame
          title="Drift forecast spread"
          subtitle={`${driftIncident.id} · projected area and uncertainty by horizon`}
          className="xl:col-span-2"
        >
          <BarSeries
            data={series.driftForecastSpread}
            xKey="horizon"
            series={[
              { key: 'areaKm2', name: 'Projected area (km²)', color: '#22c55e' },
              { key: 'uncertaintyKm2', name: 'Uncertainty (km²)', color: '#eab308' }
            ]}
          />
        </ChartFrame>
      </div>
    </div>
  );
}
