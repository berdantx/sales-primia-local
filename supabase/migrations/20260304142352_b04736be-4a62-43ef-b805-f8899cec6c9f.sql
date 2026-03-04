
-- Drop the old overload with timestamptz parameters
DROP FUNCTION IF EXISTS public.get_leads_paginated(
  uuid, timestamp with time zone, timestamp with time zone, text, text, text, text, text, text, text, text, text, boolean, text, integer, integer
);
