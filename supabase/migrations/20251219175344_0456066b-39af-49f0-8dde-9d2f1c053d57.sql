-- Fix existing users who accepted invitations but were not associated with clients
-- This associates users with their corresponding clients based on accepted invitations

INSERT INTO public.client_users (user_id, client_id, is_owner)
SELECT 
  u.id as user_id, 
  i.client_id, 
  false as is_owner
FROM public.invitations i
JOIN auth.users u ON LOWER(u.email) = LOWER(i.email)
WHERE i.status = 'accepted' 
  AND i.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_users cu 
    WHERE cu.user_id = u.id AND cu.client_id = i.client_id
  );
