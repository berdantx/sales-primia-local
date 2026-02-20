import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface CoproducerOption {
  userId: string;
  userName: string;
  userEmail: string;
}

export interface MyCoproduction {
  clientId: string;
  clientName: string;
  coproducerId: string;
  rates: { id: string; product_name: string; rate_percent: number }[];
}

export interface ProductCommission {
  productName: string;
  ratePercent: number;
  hotmart: number;
  tmb: number;
  eduzz: number;
  total: number;
}

export interface ClientCommissions {
  clientId: string;
  clientName: string;
  products: ProductCommission[];
  subtotal: number;
}

type PeriodKey = '1d' | '7d' | '30d' | '90d' | '365d' | 'all';

function getDateFrom(period: PeriodKey): string | null {
  if (period === 'all') return null;
  const days = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  return subDays(new Date(), days[period]).toISOString();
}

export function useMyCoproductions(userId: string | null) {
  return useQuery({
    queryKey: ['my-coproductions-all', userId],
    queryFn: async (): Promise<MyCoproduction[]> => {
      if (!userId) return [];

      const { data: coproducers, error } = await supabase
        .from('client_coproducers')
        .select('id, client_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      if (!coproducers?.length) return [];

      const clientIds = [...new Set(coproducers.map(c => c.client_id))];
      const coproducerIds = coproducers.map(c => c.id);

      const [{ data: clients }, { data: rates }] = await Promise.all([
        supabase.from('clients').select('id, name').in('id', clientIds),
        supabase.from('coproducer_product_rates').select('id, coproducer_id, product_name, rate_percent').in('coproducer_id', coproducerIds),
      ]);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);

      return coproducers.map(c => ({
        clientId: c.client_id,
        clientName: clientMap.get(c.client_id) || 'Cliente',
        coproducerId: c.id,
        rates: (rates || [])
          .filter(r => r.coproducer_id === c.id)
          .map(r => ({ id: r.id, product_name: r.product_name, rate_percent: Number(r.rate_percent) })),
      }));
    },
    enabled: !!userId,
  });
}

export function useAllCoproducers(enabled: boolean) {
  return useQuery({
    queryKey: ['all-coproducers'],
    queryFn: async (): Promise<CoproducerOption[]> => {
      const { data: coproducers, error } = await supabase
        .from('client_coproducers')
        .select('user_id')
        .eq('is_active', true);

      if (error) throw error;
      if (!coproducers?.length) return [];

      const uniqueUserIds = [...new Set(coproducers.map(c => c.user_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', uniqueUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return uniqueUserIds.map(uid => ({
        userId: uid,
        userName: profileMap.get(uid) || 'Sem nome',
        userEmail: '',
      }));
    },
    enabled,
  });
}

export function useAllCoproductionsForUser(userId: string | null) {
  return useQuery({
    queryKey: ['all-coproductions-for-user', userId],
    queryFn: async (): Promise<MyCoproduction[]> => {
      if (!userId) return [];

      const { data: coproducers, error } = await supabase
        .from('client_coproducers')
        .select('id, client_id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      if (!coproducers?.length) return [];

      const clientIds = [...new Set(coproducers.map(c => c.client_id))];
      const coproducerIds = coproducers.map(c => c.id);

      const [{ data: clients }, { data: rates }] = await Promise.all([
        supabase.from('clients').select('id, name').in('id', clientIds),
        supabase.from('coproducer_product_rates').select('id, coproducer_id, product_name, rate_percent').in('coproducer_id', coproducerIds),
      ]);

      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);

      return coproducers.map(c => ({
        clientId: c.client_id,
        clientName: clientMap.get(c.client_id) || 'Cliente',
        coproducerId: c.id,
        rates: (rates || [])
          .filter(r => r.coproducer_id === c.id)
          .map(r => ({ id: r.id, product_name: r.product_name, rate_percent: Number(r.rate_percent) })),
      }));
    },
    enabled: !!userId,
  });
}

export function useCoproducerCommissions(
  coproductions: MyCoproduction[] | undefined,
  period: PeriodKey
) {
  return useQuery({
    queryKey: ['coproducer-commissions', coproductions?.map(c => c.coproducerId), period],
    queryFn: async (): Promise<{ clients: ClientCommissions[]; grandTotal: number }> => {
      if (!coproductions?.length) return { clients: [], grandTotal: 0 };

      const dateFrom = getDateFrom(period);
      const coproducerIds = coproductions.map(c => c.coproducerId);

      const { data, error } = await supabase.rpc('get_coproducer_commissions', {
        p_coproducer_ids: coproducerIds,
        p_date_from: dateFrom,
      });

      if (error) throw error;

      // Group by client
      const clientMap = new Map<string, ClientCommissions>();

      for (const row of (data || []) as any[]) {
        const pct = Number(row.rate_percent) / 100;
        const h = Number(row.hotmart_total) * pct;
        const t = Number(row.tmb_total) * pct;
        const e = Number(row.eduzz_total) * pct;

        if (!clientMap.has(row.client_id)) {
          clientMap.set(row.client_id, {
            clientId: row.client_id,
            clientName: row.client_name,
            products: [],
            subtotal: 0,
          });
        }

        const client = clientMap.get(row.client_id)!;
        client.products.push({
          productName: row.product_name,
          ratePercent: Number(row.rate_percent),
          hotmart: h,
          tmb: t,
          eduzz: e,
          total: h + t + e,
        });
        client.subtotal += h + t + e;
      }

      const results = Array.from(clientMap.values());
      const grandTotal = results.reduce((sum, c) => sum + c.subtotal, 0);
      return { clients: results, grandTotal };
    },
    enabled: !!coproductions?.length,
  });
}
