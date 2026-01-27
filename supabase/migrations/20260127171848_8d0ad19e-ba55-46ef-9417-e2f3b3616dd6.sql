-- Índices para melhorar performance das queries de leads
-- Índice composto para filtros por client_id e created_at (mais usados)
CREATE INDEX IF NOT EXISTS idx_leads_client_created ON leads(client_id, created_at DESC);

-- Índice para country (usado nos filtros de geolocalização)
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country);

-- Índice para traffic_type (usado nos KPIs)
CREATE INDEX IF NOT EXISTS idx_leads_traffic_type ON leads(traffic_type);

-- Índice para utm_content (usado na função get_top_ads)
CREATE INDEX IF NOT EXISTS idx_leads_utm_content ON leads(utm_content) WHERE utm_content IS NOT NULL;

-- Índice para source (usado nos filtros de origem)
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);