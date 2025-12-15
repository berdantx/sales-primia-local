-- Create filter_views table for saving user filter combinations
CREATE TABLE public.filter_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  period text DEFAULT 'all',
  custom_date_start date,
  custom_date_end date,
  billing_type text,
  payment_method text,
  sck_code text,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.filter_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own filter views"
  ON public.filter_views FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own filter views"
  ON public.filter_views FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own filter views"
  ON public.filter_views FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own filter views"
  ON public.filter_views FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_filter_views_updated_at
  BEFORE UPDATE ON public.filter_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();