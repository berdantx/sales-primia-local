-- Create export_jobs table to track export requests
CREATE TABLE public.export_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  export_type TEXT NOT NULL DEFAULT 'leads',
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_name TEXT,
  total_records INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own export jobs
CREATE POLICY "Users can view their own export jobs"
  ON public.export_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own export jobs
CREATE POLICY "Users can insert their own export jobs"
  ON public.export_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update export jobs (for edge function)
CREATE POLICY "Service role can update export jobs"
  ON public.export_jobs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Users can delete their own export jobs
CREATE POLICY "Users can delete their own export jobs"
  ON public.export_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_export_jobs_user_status ON public.export_jobs(user_id, status);
CREATE INDEX idx_export_jobs_created_at ON public.export_jobs(created_at DESC);

-- Create exports storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exports', 'exports', false, 104857600, ARRAY['text/csv', 'application/octet-stream']);

-- Storage policies for exports bucket
CREATE POLICY "Users can view their own exports"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can insert exports"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'exports');

CREATE POLICY "Users can delete their own exports"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);