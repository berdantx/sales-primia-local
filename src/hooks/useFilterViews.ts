import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FilterView {
  id: string;
  user_id: string;
  name: string;
  period: string;
  custom_date_start: string | null;
  custom_date_end: string | null;
  billing_type: string | null;
  payment_method: string | null;
  sck_code: string | null;
  product: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilterViewInput {
  name: string;
  period: string;
  custom_date_start?: Date | null;
  custom_date_end?: Date | null;
  billing_type?: string | null;
  payment_method?: string | null;
  sck_code?: string | null;
  product?: string | null;
  is_favorite?: boolean;
}

export function useFilterViews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['filter-views', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('filter_views')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as FilterView[];
    },
    enabled: !!user,
  });
}

export function useSaveFilterView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FilterViewInput) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('filter_views')
        .insert({
          user_id: user.id,
          name: input.name,
          period: input.period,
          custom_date_start: input.custom_date_start?.toISOString().split('T')[0] || null,
          custom_date_end: input.custom_date_end?.toISOString().split('T')[0] || null,
          billing_type: input.billing_type || null,
          payment_method: input.payment_method || null,
          sck_code: input.sck_code || null,
          product: input.product || null,
          is_favorite: input.is_favorite || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-views'] });
      toast.success('View salva com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving filter view:', error);
      toast.error('Erro ao salvar view');
    },
  });
}

export function useUpdateFilterView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<FilterViewInput> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.period !== undefined) updateData.period = input.period;
      if (input.custom_date_start !== undefined) {
        updateData.custom_date_start = input.custom_date_start?.toISOString().split('T')[0] || null;
      }
      if (input.custom_date_end !== undefined) {
        updateData.custom_date_end = input.custom_date_end?.toISOString().split('T')[0] || null;
      }
      if (input.billing_type !== undefined) updateData.billing_type = input.billing_type;
      if (input.payment_method !== undefined) updateData.payment_method = input.payment_method;
      if (input.sck_code !== undefined) updateData.sck_code = input.sck_code;
      if (input.product !== undefined) updateData.product = input.product;
      if (input.is_favorite !== undefined) updateData.is_favorite = input.is_favorite;

      const { data, error } = await supabase
        .from('filter_views')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-views'] });
      toast.success('View atualizada!');
    },
    onError: (error) => {
      console.error('Error updating filter view:', error);
      toast.error('Erro ao atualizar view');
    },
  });
}

export function useDeleteFilterView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('filter_views')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-views'] });
      toast.success('View excluída!');
    },
    onError: (error) => {
      console.error('Error deleting filter view:', error);
      toast.error('Erro ao excluir view');
    },
  });
}
