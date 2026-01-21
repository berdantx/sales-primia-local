import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

export function useFinancialAccess(clientId: string | null) {
  const { user } = useAuth();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const isMaster = role === 'master';

  const { data, isLoading: isAccessLoading } = useQuery({
    queryKey: ['financial-access', clientId, user?.id],
    queryFn: async () => {
      if (!clientId || !user?.id) return false;

      const { data, error } = await supabase
        .from('client_users')
        .select('can_view_financials')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching financial access:', error);
        return false;
      }

      return data?.can_view_financials ?? false;
    },
    enabled: !!clientId && !!user?.id && !isMaster && role === 'user',
  });

  // Masters always have access
  if (isMaster) {
    return { canViewFinancials: true, isLoading: isRoleLoading };
  }

  return {
    canViewFinancials: data ?? false,
    isLoading: isRoleLoading || isAccessLoading,
  };
}
