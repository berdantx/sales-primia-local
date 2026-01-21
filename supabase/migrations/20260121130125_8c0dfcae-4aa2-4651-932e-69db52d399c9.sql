-- Add traffic_type generated column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS traffic_type TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN utm_source ILIKE '%-ads' OR utm_medium ILIKE ANY(ARRAY['cpc', 'ppc', 'paid', 'paidsocial']) 
      THEN 'paid'
    WHEN utm_source IS NULL AND utm_medium IS NULL AND utm_campaign IS NULL
      THEN 'direct'
    ELSE 'organic'
  END
) STORED;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_leads_traffic_type ON public.leads(traffic_type);