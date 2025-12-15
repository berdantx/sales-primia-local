-- Allow masters to view all profiles (in addition to their own)
CREATE POLICY "Masters can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Allow masters to view all roles
CREATE POLICY "Masters can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Allow masters to update other user roles (not their own to prevent self-demotion)
CREATE POLICY "Masters can update other user roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master') AND user_id != auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'master') AND user_id != auth.uid());

-- Create invitations table for email invites
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Masters can view all invitations
CREATE POLICY "Masters can view all invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Masters can insert invitations
CREATE POLICY "Masters can insert invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Masters can update invitations
CREATE POLICY "Masters can update invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Anyone can view invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.invitations FOR SELECT
USING (true);

-- Service role can update invitation status (for accepting)
CREATE POLICY "Service role can update invitations"
ON public.invitations FOR UPDATE
USING (true)
WITH CHECK (true);