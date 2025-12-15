-- Add custom text columns to external_webhooks table
ALTER TABLE public.external_webhooks 
ADD COLUMN custom_text_start TEXT DEFAULT NULL,
ADD COLUMN custom_text_end TEXT DEFAULT NULL;