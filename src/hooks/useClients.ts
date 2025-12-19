import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_clients');

      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }

      return (data as Client[]) || [];
    },
    enabled: !!user,
  });
}
