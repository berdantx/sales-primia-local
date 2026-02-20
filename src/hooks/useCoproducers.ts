import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CoproducerProductRate {
  id: string;
  coproducer_id: string;
  product_name: string;
  rate_percent: number;
  created_at: string;
  updated_at: string;
}

export interface Coproducer {
  id: string;
  client_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  user_name: string | null;
  user_email: string;
  rates: CoproducerProductRate[];
}

export function useCoproducers(clientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coproducers', clientId],
    queryFn: async (): Promise<Coproducer[]> => {
      if (!clientId) return [];

      // Fetch coproducers for this client
      const { data: coproducers, error } = await supabase
        .from('client_coproducers')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!coproducers || coproducers.length === 0) return [];

      // Fetch rates for all coproducers
      const coproducerIds = coproducers.map(c => c.id);
      const { data: rates, error: ratesError } = await supabase
        .from('coproducer_product_rates')
        .select('*')
        .in('coproducer_id', coproducerIds);

      if (ratesError) throw ratesError;

      // Fetch profiles for user names
      const userIds = coproducers.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      const ratesMap = new Map<string, CoproducerProductRate[]>();
      (rates || []).forEach(r => {
        const existing = ratesMap.get(r.coproducer_id) || [];
        existing.push(r as CoproducerProductRate);
        ratesMap.set(r.coproducer_id, existing);
      });

      return coproducers.map(c => ({
        ...c,
        user_name: profileMap.get(c.user_id) || null,
        user_email: '', // populated client-side if needed
        rates: ratesMap.get(c.id) || [],
      })) as Coproducer[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useAddCoproducer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, userId }: { clientId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('client_coproducers')
        .insert({ client_id: clientId, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coproducers', vars.clientId] });
      toast.success('Coprodutor adicionado com sucesso');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este usuário já é coprodutor deste cliente');
      } else {
        toast.error('Erro ao adicionar coprodutor');
      }
    },
  });
}

export function useToggleCoproducer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive, clientId }: { id: string; isActive: boolean; clientId: string }) => {
      const { error } = await supabase
        .from('client_coproducers')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coproducers', vars.clientId] });
      toast.success(vars.isActive ? 'Coprodutor ativado' : 'Coprodutor desativado');
    },
    onError: () => toast.error('Erro ao alterar status do coprodutor'),
  });
}

export function useRemoveCoproducer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_coproducers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coproducers', vars.clientId] });
      toast.success('Coprodutor removido');
    },
    onError: () => toast.error('Erro ao remover coprodutor'),
  });
}

export function useSetProductRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ coproducerId, productName, ratePercent, clientId }: {
      coproducerId: string;
      productName: string;
      ratePercent: number;
      clientId: string;
    }) => {
      const { error } = await supabase
        .from('coproducer_product_rates')
        .upsert(
          { coproducer_id: coproducerId, product_name: productName, rate_percent: ratePercent },
          { onConflict: 'coproducer_id,product_name' }
        );

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coproducers', vars.clientId] });
      toast.success('Taxa atualizada');
    },
    onError: () => toast.error('Erro ao atualizar taxa'),
  });
}

export function useRemoveProductRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('coproducer_product_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coproducers', vars.clientId] });
      toast.success('Taxa removida');
    },
    onError: () => toast.error('Erro ao remover taxa'),
  });
}

// Hook for the logged-in user to check their coproduction data
export function useMyCoproduction(clientId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-coproduction', clientId, user?.id],
    queryFn: async () => {
      if (!clientId || !user?.id) return null;

      // Check if user is a coproducer for this client
      const { data: coproducer, error } = await supabase
        .from('client_coproducers')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!coproducer) return null;

      // Fetch product rates
      const { data: rates, error: ratesError } = await supabase
        .from('coproducer_product_rates')
        .select('*')
        .eq('coproducer_id', coproducer.id);

      if (ratesError) throw ratesError;

      return {
        coproducerId: coproducer.id,
        rates: (rates || []) as CoproducerProductRate[],
      };
    },
    enabled: !!user && !!clientId,
  });
}

// Hook to get distinct products for a client (from transactions)
export function useClientProducts(clientId: string | null) {
  return useQuery({
    queryKey: ['client-products', clientId],
    queryFn: async (): Promise<string[]> => {
      if (!clientId) return [];

      const products = new Set<string>();

      // Hotmart transactions
      const { data: hotmart } = await supabase
        .from('transactions')
        .select('product')
        .eq('client_id', clientId)
        .not('product', 'is', null);

      hotmart?.forEach(t => { if (t.product) products.add(t.product); });

      // Eduzz transactions
      const { data: eduzz } = await supabase
        .from('eduzz_transactions')
        .select('product')
        .eq('client_id', clientId)
        .not('product', 'is', null);

      eduzz?.forEach(t => { if (t.product) products.add(t.product); });

      // TMB transactions
      const { data: tmb } = await supabase
        .from('tmb_transactions')
        .select('product')
        .eq('client_id', clientId)
        .not('product', 'is', null);

      tmb?.forEach(t => { if (t.product) products.add(t.product); });

      return Array.from(products).sort();
    },
    enabled: !!clientId,
  });
}
