-- Add can_view_financials column to client_users table
-- This allows granular control of financial data visibility per user per client
ALTER TABLE public.client_users 
ADD COLUMN can_view_financials boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.client_users.can_view_financials IS 'When true, allows non-master users to view financial data for this client';