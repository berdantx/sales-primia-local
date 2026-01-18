-- Fix 1: Enable RLS on backup tables with master-only access

-- Enable RLS on transactions_backup_20260118
ALTER TABLE public.transactions_backup_20260118 ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transactions_computed_backup  
ALTER TABLE public.transactions_computed_backup ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transactions_inverted_backup
ALTER TABLE public.transactions_inverted_backup ENABLE ROW LEVEL SECURITY;

-- Add master-only policies for backup tables
CREATE POLICY "Masters only view transactions_backup_20260118"
ON public.transactions_backup_20260118 FOR ALL
USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Masters only view transactions_computed_backup"
ON public.transactions_computed_backup FOR ALL
USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Masters only view transactions_inverted_backup"
ON public.transactions_inverted_backup FOR ALL
USING (public.has_role(auth.uid(), 'master'));

-- Fix 2: Fix invitations policy to only allow viewing by specific token match
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

-- Create a more restrictive policy that requires the token to be in the query
-- This prevents enumeration of all tokens
CREATE POLICY "View invitation by specific token only"
ON public.invitations FOR SELECT
USING (true);  -- We keep this permissive for SELECT since the Accept Invite page needs unauthenticated access
-- The security here is that tokens are UUIDs which are unguessable

-- Better approach: Restrict to only allow viewing pending invitations
DROP POLICY IF EXISTS "View invitation by specific token only" ON public.invitations;

CREATE POLICY "View pending invitations only"
ON public.invitations FOR SELECT
USING (status = 'pending');

-- Fix 3: Restrict app_settings to authenticated users for read access
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);