-- Drop old function versions without p_client_id parameter
DROP FUNCTION IF EXISTS public.get_tmb_transaction_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_tmb_sales_by_date(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_tmb_top_customers(timestamp with time zone, timestamp with time zone, integer);
DROP FUNCTION IF EXISTS public.get_transaction_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_transaction_stats(timestamp with time zone, timestamp with time zone, text, text, text);
DROP FUNCTION IF EXISTS public.get_transaction_stats(timestamp with time zone, timestamp with time zone, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_sales_by_date(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_sales_by_date(timestamp with time zone, timestamp with time zone, text, text, text);
DROP FUNCTION IF EXISTS public.get_sales_by_date(timestamp with time zone, timestamp with time zone, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_top_customers(timestamp with time zone, timestamp with time zone, integer);
DROP FUNCTION IF EXISTS public.get_top_customers(timestamp with time zone, timestamp with time zone, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_top_customers(timestamp with time zone, timestamp with time zone, integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_transaction_date_range();
DROP FUNCTION IF EXISTS public.get_filter_options_with_counts();
DROP FUNCTION IF EXISTS public.get_tmb_filter_options();

-- Insert the initial client
INSERT INTO public.clients (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Camila Vieira', 'camila-vieira')
ON CONFLICT (id) DO NOTHING;

-- Associate all existing users with this client
INSERT INTO public.client_users (user_id, client_id, is_owner)
SELECT id, '00000000-0000-0000-0000-000000000001'::uuid, true
FROM auth.users
ON CONFLICT DO NOTHING;

-- Update all transactions to use this client_id
UPDATE public.transactions 
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE client_id IS NULL;

-- Update all tmb_transactions to use this client_id
UPDATE public.tmb_transactions 
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE client_id IS NULL;

-- Update all goals to use this client_id
UPDATE public.goals 
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE client_id IS NULL;

-- Update all imports to use this client_id
UPDATE public.imports 
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE client_id IS NULL;

-- Update all filter_views to use this client_id
UPDATE public.filter_views 
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE client_id IS NULL;

-- Update all external_webhooks to use this client_id
UPDATE public.external_webhooks 
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE client_id IS NULL;

-- Update all webhook_logs to use this client_id
UPDATE public.webhook_logs 
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE client_id IS NULL;