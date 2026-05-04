-- =====================================================
-- VENTAS & MARKETING: Métricas por canal
-- =====================================================

CREATE TABLE ventas_metricas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canal           TEXT NOT NULL CHECK (canal IN (
    'instagram','linkedin_blog','linkedin_outreach',
    'facebook','x_twitter','cold_calling','ad_campaign'
  )),
  periodo         DATE NOT NULL,
  -- Alcance
  impresiones     INTEGER DEFAULT 0,
  alcance         INTEGER DEFAULT 0,
  seguidores_new  INTEGER DEFAULT 0,
  -- Engagement
  likes           INTEGER DEFAULT 0,
  comentarios     INTEGER DEFAULT 0,
  shares          INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  -- Conversión
  leads           INTEGER DEFAULT 0,
  llamadas        INTEGER DEFAULT 0,
  citas           INTEGER DEFAULT 0,
  propuestas      INTEGER DEFAULT 0,
  cierres         INTEGER DEFAULT 0,
  -- Financiero
  inversion_ads   NUMERIC(12,2) DEFAULT 0,
  ingreso_generado NUMERIC(12,2) DEFAULT 0,
  -- Meta
  notas           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(canal, periodo)
);

CREATE INDEX idx_ventas_canal ON ventas_metricas(canal);
CREATE INDEX idx_ventas_periodo ON ventas_metricas(periodo);

ALTER TABLE ventas_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON ventas_metricas FOR ALL USING (true) WITH CHECK (true);
