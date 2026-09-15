-- ============================================================
-- OIL SPILL DETECTION - SUPABASE DATABASE SCHEMA
-- ============================================================
-- Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================


-- ============================================================
-- 1. SCANS TABLE
-- ============================================================
-- Each row represents one uploaded SAR image scan.

CREATE TABLE IF NOT EXISTS scans (

    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    filename    TEXT NOT NULL,

    image_url   TEXT,

    overlay_url TEXT,

    width       INTEGER,

    height      INTEGER,

    detected    BOOLEAN NOT NULL DEFAULT FALSE,

    scan_date   TIMESTAMPTZ NOT NULL DEFAULT now(),

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. DETECTIONS TABLE
-- ============================================================
-- Each row represents one detected oil spill region for a scan.

CREATE TABLE IF NOT EXISTS detections (

    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    scan_id     UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,

    confidence  DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    latitude    DOUBLE PRECISION,

    longitude   DOUBLE PRECISION,

    area_m2     DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    area_km2    DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    perimeter_m DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    num_regions INTEGER NOT NULL DEFAULT 0,

    threshold   DOUBLE PRECISION NOT NULL DEFAULT 0.4,

    polygon     JSONB DEFAULT '[]'::JSONB,

    polygons    JSONB DEFAULT '[]'::JSONB,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_scans_scan_date
    ON scans (scan_date DESC);

CREATE INDEX IF NOT EXISTS idx_scans_detected
    ON scans (detected);

CREATE INDEX IF NOT EXISTS idx_detections_scan_id
    ON detections (scan_id);

CREATE INDEX IF NOT EXISTS idx_detections_confidence
    ON detections (confidence DESC);


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS but allow all operations via service role key.
-- Adjust policies as needed for your auth setup.

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;

-- Allow all operations (restrict later based on your auth)

CREATE POLICY "Allow all on scans"
    ON scans FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all on detections"
    ON detections FOR ALL
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- 5. STORAGE BUCKET
-- ============================================================
-- Run this separately or create via Supabase Dashboard:
-- Storage > New Bucket > Name: "sar-uploads" > Public: ON

INSERT INTO storage.buckets (id, name, public)
VALUES ('sar-uploads', 'sar-uploads', true)
ON CONFLICT (id) DO NOTHING;
