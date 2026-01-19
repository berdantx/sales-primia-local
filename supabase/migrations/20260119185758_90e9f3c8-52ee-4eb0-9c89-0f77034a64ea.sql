-- Add geolocation columns to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Add index for efficient country filtering and grouping
CREATE INDEX IF NOT EXISTS idx_leads_country ON public.leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_country_code ON public.leads(country_code);