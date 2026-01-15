-- Create app_settings table for branding and theme configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings
CREATE POLICY "Anyone can view app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Only masters can insert settings
CREATE POLICY "Masters can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Only masters can update settings
CREATE POLICY "Masters can update app settings" 
ON public.app_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'master'::app_role));

-- Only masters can delete settings
CREATE POLICY "Masters can delete app settings" 
ON public.app_settings 
FOR DELETE 
USING (has_role(auth.uid(), 'master'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create branding storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Storage policies for branding bucket
CREATE POLICY "Anyone can view branding files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'branding');

CREATE POLICY "Masters can upload branding files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can update branding files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can delete branding files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'master'::app_role));