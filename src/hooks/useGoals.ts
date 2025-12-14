import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Goal {
  id: string;
  name: string;
  target_value: number;
  currency: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  name: string;
  target_value: number;
  currency: string;
  start_date: string;
  end_date: string;
}

export function useGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });
}

export function useActiveGoals() {
  const { data: goals, isLoading } = useGoals();
  const activeGoals = goals?.filter(g => g.is_active) || [];
  return { activeGoals, isLoading };
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...input,
          user_id: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: 'Meta criada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar meta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      // Log history
      const { data: oldGoal } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Add to history
      await supabase.from('goal_history').insert({
        goal_id: id,
        user_id: user!.id,
        action: 'update',
        old_value: oldGoal,
        new_value: data,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: 'Meta atualizada!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar meta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: 'Meta excluída!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir meta', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
