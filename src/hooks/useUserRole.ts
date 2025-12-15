import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'master' | 'admin' | 'user';

interface UserRoleResult {
  role: AppRole;
  isLoading: boolean;
  isMaster: boolean;
  isAdmin: boolean;
  isClient: boolean;
}

export function useUserRole(): UserRoleResult {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'user' as AppRole;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) {
        console.error('Error fetching user role:', error);
        return 'user' as AppRole;
      }
      
      return data.role as AppRole;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const currentRole = role || 'user';

  return {
    role: currentRole,
    isLoading,
    isMaster: currentRole === 'master',
    isAdmin: currentRole === 'admin' || currentRole === 'master',
    isClient: currentRole === 'user',
  };
}
