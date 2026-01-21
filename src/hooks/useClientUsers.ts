import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  is_owner: boolean;
  can_view_financials: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    user_id: string;
  };
}

export function useClientUsers(clientId: string | null) {
  return useQuery({
    queryKey: ['client-users', clientId],
    queryFn: async (): Promise<ClientUser[]> => {
      if (!clientId) return [];

      // First get client users
      const { data: clientUsers, error: clientUsersError } = await supabase
        .from('client_users')
        .select('*')
        .eq('client_id', clientId)
        .order('is_owner', { ascending: false });

      if (clientUsersError) throw clientUsersError;
      if (!clientUsers || clientUsers.length === 0) return [];

      // Then get profiles for those users
      const userIds = clientUsers.map(cu => cu.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) {
        // Return without profiles if we can't fetch them
        return clientUsers as ClientUser[];
      }

      // Merge profiles with client users
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      return clientUsers.map(cu => ({
        ...cu,
        profile: profileMap.get(cu.user_id) || undefined,
      })) as ClientUser[];
    },
    enabled: !!clientId,
  });
}

export function useAvailableUsers() {
  return useQuery({
    queryKey: ['available-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddUserToClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ clientId, userId, isOwner = false }: { clientId: string; userId: string; isOwner?: boolean }) => {
      const { data, error } = await supabase
        .from('client_users')
        .insert({
          client_id: clientId,
          user_id: userId,
          is_owner: isOwner,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-users', clientId] });
      toast({ title: 'Usuário adicionado ao cliente!' });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ title: 'Este usuário já está associado ao cliente', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao adicionar usuário', description: error.message, variant: 'destructive' });
      }
    },
  });
}

export function useRemoveUserFromClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-users', data.clientId] });
      toast({ title: 'Usuário removido do cliente!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover usuário', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateClientUserOwnership() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId, isOwner }: { id: string; clientId: string; isOwner: boolean }) => {
      const { error } = await supabase
        .from('client_users')
        .update({ is_owner: isOwner })
        .eq('id', id);

      if (error) throw error;
      return { clientId, isOwner };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-users', data.clientId] });
      toast({ title: data.isOwner ? 'Promovido a owner!' : 'Rebaixado de owner!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFinancialAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      clientId, 
      targetUserId,
      canViewFinancials, 
      oldValue 
    }: { 
      id: string; 
      clientId: string; 
      targetUserId: string;
      canViewFinancials: boolean; 
      oldValue: boolean;
    }) => {
      // Update permission
      const { error: updateError } = await supabase
        .from('client_users')
        .update({ can_view_financials: canViewFinancials })
        .eq('id', id);

      if (updateError) throw updateError;

      // Log to audit table
      if (user) {
        const { error: auditError } = await supabase
          .from('permission_audit_logs')
          .insert({
            target_user_id: targetUserId,
            client_id: clientId,
            changed_by: user.id,
            action: canViewFinancials ? 'granted' : 'revoked',
            permission_type: 'financial_access',
            old_value: oldValue,
            new_value: canViewFinancials,
            user_agent: navigator.userAgent,
          });

        if (auditError) {
          console.error('Failed to log permission change:', auditError);
        }
      }

      return { clientId, canViewFinancials };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-users', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['financial-access'] });
      toast({ title: data.canViewFinancials ? 'Acesso financeiro liberado!' : 'Acesso financeiro removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar permissão', description: error.message, variant: 'destructive' });
    },
  });
}
