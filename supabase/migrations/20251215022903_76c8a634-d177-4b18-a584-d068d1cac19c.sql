-- Add source column to existing transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'hotmart';

-- Update existing transactions to have hotmart as source
UPDATE public.transactions SET source = 'hotmart' WHERE source IS NULL;

-- Create tmb_transactions table
CREATE TABLE public.tmb_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  import_id UUID REFERENCES public.imports(id) ON DELETE SET NULL,
  
  -- Unique identifier
  order_id TEXT NOT NULL,
  
  -- Product
  product TEXT,
  
  -- Customer
  buyer_name TEXT,
  buyer_email TEXT,
  
  -- Value (always BRL)
  ticket_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  
  -- Date
  effective_date TIMESTAMPTZ,
  
  -- UTM Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'tmb',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, order_id)
);

-- Enable RLS
ALTER TABLE public.tmb_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tmb transactions" 
ON public.tmb_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tmb transactions" 
ON public.tmb_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tmb transactions" 
ON public.tmb_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tmb transactions" 
ON public.tmb_transactions 
FOR DELETE 
USING (auth.uid() = user_id);