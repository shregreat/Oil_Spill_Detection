'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, RotateCcw, Upload, FileCheck, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { Button, ToggleChip } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ProcessingIndicator } from '@/components/ui/ProcessingIndicator';
import { ConfidenceMeter } from '@/components/ui/ConfidenceBadge';
import { StageBadge } from '@/components/ui/StatusBadge';
import { SatelliteViewer, VIEWER_MODES, type ViewerMode } from '@/components/satellite/SatelliteViewer';
import { oilSpillService, type PredictResponse, type SampleScene } from '@/services/oilSpillService';
import type { ProcessingStage, SatelliteScene } from '@/lib/types';
import { SATELLITE_SCENES } from '@/lib/mock/satellite';
import { INCIDENTS } from '@/lib/mock/incidents';

export default function DetectionPage() {
  const [activeTab, setActiveTab] = useState<'samples' | 'upload'>('samples');
  const [samples, setSamples] = useState<SampleScene[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleScene | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ViewerMode>('overlay');
  const [showOverlay, setShowOverlay] = useState(true);
  const [runStage, setRunStage] = useState<ProcessingStage | null>(null);
  const [detectResult, setDetectResult] = useState<PredictResponse | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load server-side sample SAR scenes on mount
  useEffect(() => {
    async function loadSamples() {
      setIsLoadingSamples(true);
      try {
        const list = await oilSpillService.listSamples();
        setSamples(list);
        if (list.length > 0) {
          setSelectedSample(list[0]);
        }
      } catch {
        // Handled silently, fallback available
      } finally {
        setIsLoadingSamples(false);
      }
    }
    loadSamples();
  }, []);

  // Run AI Detection on selected sample or uploaded file
  const handleRunDetection = async () => {
    setDetectError(null);
    setRunStage('queued');

    try {
      setTimeout(() => setRunStage('processing'), 400);
      setTimeout(() => setRunStage('detection'), 1400);

      let result: PredictResponse;
      if (activeTab === 'upload' && uploadedFile) {
        result = await oilSpillService.detectFile(uploadedFile);
      } else if (selectedSample) {
        result = await oilSpillService.detectSample(selectedSample.filename);
      } else {
        throw new Error('Please select a sample radar scene or upload a .tif file');
      }

      setDetectResult(result);
      setRunStage('complete');
    } catch (err: unknown) {
      setRunStage('failed');
      const msg = err instanceof Error ? err.message : 'Detection failed';
      setDetectError(msg);
    }
  };

  const handleReset = () => {
    setRunStage(null);
    setDetectResult(null);
    setDetectError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      handleReset();
    }
  };

  // Construct active scene metadata for the viewer
  const activeSceneMetadata: SatelliteScene = {
    id: activeTab === 'upload' && uploadedFile
      ? uploadedFile.name.replace(/\.[^/.]+$/, '').toUpperCase()
      : selectedSample
      ? selectedSample.filename.replace(/\.[^/.]+$/, '').toUpperCase()
      : SATELLITE_SCENES[0].id,
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW (Interferometric Wide)',
    polarisation: 'VV+VH',
    resolutionM: 10,
    incidenceAngleDeg: 38.2,
    cloudCoverPct: 0,
    center: [28.8, -89.9],
    swathKm: 250,
    orbit: 14220,
    passDirection: 'descending',
    sizeMb: selectedSample?.size_mb ?? 24.5,
    acquiredAt: new Date().toISOString(),
    region: selectedSample?.region ?? 'Offshore Marine Zone',
    footprint: [[29.5, -90.8], [29.5, -89.1], [28.2, -89.1], [28.2, -90.8], [29.5, -90.8]],
    processingStage: runStage ?? 'complete',
    detectedIncidentId: detectResult?.detected ? 'INC-REAL-01' : undefined
  };

  // Compute image overlay source: either live backend base64 or fallback
  const overlayImageSrc = detectResult?.overlay_base64
    ? `data:image/png;base64,${detectResult.overlay_base64}`
    : detectResult?.overlay_url ?? null;

  const processing = runStage === 'queued' || runStage === 'processing' || runStage === 'detection';

  // Active detected vector contour or fallback from incident dataset
  const activePolygon = detectResult?.polygon && detectResult.polygon.length > 2
    ? (detectResult.polygon as [number, number][])
    : INCIDENTS[0]?.slick?.polygon;

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="AI Oil Spill Detection Studio"
        description="Run deep-learning semantic segmentation on Sentinel-1 SAR imagery using the PyTorch U-Net model."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleRunDetection}
              disabled={processing || (activeTab === 'upload' && !uploadedFile)}
            >
              <Play className="h-3.5 w-3.5" />
              {processing ? 'Analyzing...' : 'Run U-Net Detection'}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Column: Data Source Selector */}
        <div className="space-y-3">
          <Panel title="SAR Imagery Source" subtitle="Choose sample or upload your own">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-deep/60 p-1 mb-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('samples');
                  handleReset();
                }}
                className={`rounded-md py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'samples'
                    ? 'bg-accent/20 text-accent shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Radar Samples ({samples.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  handleReset();
                }}
                className={`rounded-md py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'upload'
                    ? 'bg-accent/20 text-accent shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Upload TIFF
              </button>
            </div>

            {activeTab === 'samples' ? (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {isLoadingSamples ? (
                  <p className="text-xs text-muted py-4 text-center">Loading radar scenes...</p>
                ) : samples.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">No samples found on server.</p>
                ) : (
                  samples.map((s) => (
                    <button
                      key={s.filename}
                      type="button"
                      onClick={() => {
                        setSelectedSample(s);
                        handleReset();
                      }}
                      className={`w-full rounded-lg border p-2.5 text-left transition-colors focus-ring ${
                        selectedSample?.filename === s.filename
                          ? 'border-accent/60 bg-accent/10'
                          : 'border-line/70 bg-deep/40 hover:border-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] text-accent font-semibold truncate">
                          {s.filename}
                        </span>
                        <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-muted">
                          {s.size_mb} MB
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink">{s.region}</p>
                      <p className="text-[10px] text-muted">
                        {s.width && s.height ? `${s.width} × ${s.height} px · ` : ''}
                        {s.crs || 'WGS 84'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".tif,.tiff"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line/80 bg-deep/30 p-6 text-center cursor-pointer transition-colors hover:border-accent/60 hover:bg-accent/5"
                >
                  <Upload className="h-8 w-8 text-accent/70 mb-2" />
                  <p className="text-xs font-semibold text-ink">Click to upload SAR GeoTIFF</p>
                  <p className="text-[11px] text-muted mt-1">Accepts Sentinel-1 .tif / .tiff up to 50 MB</p>
                </div>

                {uploadedFile && (
                  <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="h-4 w-4 text-accent shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-mono text-ink truncate">{uploadedFile.name}</p>
                        <p className="text-[10px] text-muted">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setUploadedFile(null)}>
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* Model Hyperparameters */}
          <Panel title="Detection Parameters" subtitle="U-Net sliding-window config">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Window Size</span>
                <span className="font-mono text-ink font-semibold">256 × 256 px</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Stride</span>
                <span className="font-mono text-ink font-semibold">128 px (50% overlap)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Threshold</span>
                <span className="font-mono text-accent font-semibold">0.40</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Noise Filter</span>
                <span className="font-mono text-ink font-semibold">≥ 100 pixels</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column: Viewer & Results */}
        <div className="space-y-3">
          {/* Error Banner */}
          {detectError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{detectError}</span>
            </div>
          )}

          {/* Scene Viewer */}
          <Panel
            title="SAR Imagery & Mask Viewer"
            subtitle={`${activeSceneMetadata.mission} · ${activeSceneMetadata.polarisation}`}
            actions={
              <ToggleChip active={showOverlay} onClick={() => setShowOverlay((v) => !v)}>
                Detection Overlay
              </ToggleChip>
            }
          >
            <Tabs
              tabs={VIEWER_MODES.map((m) => ({ id: m.id, label: m.label }))}
              active={mode}
              onChange={(id) => setMode(id as ViewerMode)}
              className="mb-3"
            />
            <SatelliteViewer
              scene={activeSceneMetadata}
              polygon={activePolygon}
              mode={mode}
              showOverlay={showOverlay}
              scanning={processing}
              overlayImage={showOverlay ? overlayImageSrc : null}
              className="aspect-video w-full"
            />
          </Panel>

          {/* Pipeline Stage Indicator */}
          <Panel
            title="Model Processing Pipeline"
            subtitle="Tiling → Inference → Post-processing → Vector Extraction"
            actions={<StageBadge stage={runStage ?? 'queued'} />}
          >
            <ProcessingIndicator stage={runStage ?? 'queued'} />
          </Panel>

          {/* Detection Results */}
          <Panel
            title="Detection Metrics"
            subtitle={
              detectResult
                ? detectResult.detected
                  ? 'Active Spill Detected'
                  : 'Clean Ocean — No Spill'
                : 'Awaiting Pipeline Execution'
            }
          >
            {detectResult ? (
              <div className="space-y-4">
                {detectResult.detected ? (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-400" />
                      <div>
                        <p className="text-xs font-bold text-red-200">OIL SPILL DETECTED</p>
                        <p className="text-[11px] text-red-300/80">
                          High-confidence anomaly identified in SAR backscatter.
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-red-300">
                      {(detectResult.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-emerald-200">CLEAN OCEAN</p>
                      <p className="text-[11px] text-emerald-300/80">
                        No slick patterns exceeding probability threshold of {detectResult.threshold}.
                      </p>
                    </div>
                  </div>
                )}

                <ConfidenceMeter confidence={detectResult.confidence} />

                <KeyValueGrid columns={4}>
                  <KeyValue label="Spill Area" value={`${detectResult.area_km2.toFixed(4)} km²`} />
                  <KeyValue label="Area (m²)" value={`${detectResult.area_m2.toLocaleString()} m²`} />
                  <KeyValue label="Perimeter" value={`${(detectResult.perimeter_m / 1000).toFixed(2)} km`} />
                  <KeyValue label="Spill Regions" value={String(detectResult.num_regions)} />
                  <KeyValue
                    label="Latitude"
                    value={detectResult.latitude !== null ? `${detectResult.latitude.toFixed(5)}°` : 'N/A'}
                  />
                  <KeyValue
                    label="Longitude"
                    value={detectResult.longitude !== null ? `${detectResult.longitude.toFixed(5)}°` : 'N/A'}
                  />
                  <KeyValue label="Model Architecture" value="U-Net DeepConv" hint="PyTorch 2.x" />
                  <KeyValue label="Threshold" value={String(detectResult.threshold)} />
                </KeyValueGrid>
              </div>
            ) : (
              <p className="text-xs text-muted">
                Select a radar sample or upload a GeoTIFF image and click &quot;Run U-Net Detection&quot; to inspect real model predictions.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
