import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateClientData {
  name: string;
  slug: string;
  logo_url?: string;
}

interface UpdateClientData {
  id: string;
  name?: string;
  slug?: string;
  logo_url?: string;
  is_active?: boolean;
}

export function useClientManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createClient = useMutation({
    mutationFn: async (data: CreateClientData) => {
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          slug: data.slug,
          logo_url: data.logo_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente criado',
        description: 'O cliente foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar cliente',
        description: error.message || 'Ocorreu um erro ao criar o cliente.',
        variant: 'destructive',
      });
    },
  });

  const updateClient = useMutation({
    mutationFn: async (data: UpdateClientData) => {
      const { id, ...updateData } = data;
      const { data: client, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente atualizado',
        description: 'O cliente foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message || 'Ocorreu um erro ao atualizar o cliente.',
        variant: 'destructive',
      });
    },
  });

  const toggleClientStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: client, error } = await supabase
        .from('clients')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return client;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: variables.is_active ? 'Cliente ativado' : 'Cliente desativado',
        description: `O cliente foi ${variables.is_active ? 'ativado' : 'desativado'} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao alterar status',
        description: error.message || 'Ocorreu um erro ao alterar o status do cliente.',
        variant: 'destructive',
      });
    },
  });

  return {
    createClient,
    updateClient,
    toggleClientStatus,
  };
}
