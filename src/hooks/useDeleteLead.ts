import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Lead } from './useLeads';
import { toast } from '@/hooks/use-toast';

interface DeleteLeadParams {
  lead: Lead;
  justification: string;
}

export function useDeleteLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lead, justification }: DeleteLeadParams) => {
      if (!user) throw new Error('User not authenticated');
      if (!lead.client_id) throw new Error('Lead has no client_id');

      // 1. First, log the deletion with full lead data for audit
      // Using type assertion since the table was just created
      const { error: logError } = await supabase
        .from('lead_deletion_logs' as 'leads')
        .insert({
          lead_id: lead.id,
          client_id: lead.client_id,
          deleted_by: user.id,
          justification,
          lead_data: lead as unknown as Record<string, unknown>,
        } as unknown as Record<string, unknown>);

      if (logError) {
        console.error('Error logging lead deletion:', logError);
        throw new Error('Falha ao registrar auditoria da exclusão');
      }

      // 2. Then delete the lead
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);

      if (deleteError) {
        console.error('Error deleting lead:', deleteError);
        throw new Error('Falha ao excluir o lead');
      }

      return { leadId: lead.id };
    },
    onSuccess: () => {
      // Invalidate leads queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-count'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      
      toast({
        title: 'Lead excluído',
        description: 'O lead foi excluído com sucesso e registrado na auditoria.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
