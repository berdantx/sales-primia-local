import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AppRole } from './useUserRole';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
}

export function useUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, created_at');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Then get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        throw rolesError;
      }

      // Create a map of user_id to role
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]) || []);

      // Combine profiles with roles
      return (profiles || []).map(profile => ({
        id: profile.user_id,
        email: '', // Will be populated below
        full_name: profile.full_name,
        role: roleMap.get(profile.user_id) || 'user',
        created_at: profile.created_at,
      }));
    },
    enabled: !!user,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Nível de acesso atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar nível de acesso');
    },
  });

  return {
    users,
    isLoading,
    updateRole: updateRoleMutation.mutate,
    isUpdating: updateRoleMutation.isPending,
  };
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  role: AppRole;
  created_at: string;
  expires_at: string;
}

export function useInvitations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: async (): Promise<Invitation[]> => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!user,
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Convite enviado com sucesso');
    },
    onError: (error: any) => {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Erro ao enviar convite');
    },
  });

  return {
    invitations,
    isLoading,
    sendInvite: sendInviteMutation.mutate,
    isSending: sendInviteMutation.isPending,
  };
}
