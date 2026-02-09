
-- Drop remaining old overloads that have uuid as first param
DROP FUNCTION IF EXISTS public.get_landing_page_stats(uuid, timestamptz, timestamptz, integer, integer);
DROP FUNCTION IF EXISTS public.get_landing_page_stats(uuid, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_funnel_evolution(uuid, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_conversion_summary(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_conversion_summary(uuid, timestamptz, timestamptz);
