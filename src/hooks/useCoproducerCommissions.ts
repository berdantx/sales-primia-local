import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

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

export function useCoproducerCommissions(
  coproductions: MyCoproduction[] | undefined,
  period: PeriodKey
) {
  return useQuery({
    queryKey: ['coproducer-commissions', coproductions?.map(c => c.coproducerId), period],
    queryFn: async (): Promise<{ clients: ClientCommissions[]; grandTotal: number }> => {
      if (!coproductions?.length) return { clients: [], grandTotal: 0 };

      const dateFrom = getDateFrom(period);
      const results: ClientCommissions[] = [];

      for (const coprod of coproductions) {
        if (!coprod.rates.length) continue;

        const productNames = coprod.rates.map(r => r.product_name);

        // Build queries for each platform
        let hotmartQuery = supabase
          .from('transactions')
          .select('product, computed_value')
          .eq('client_id', coprod.clientId)
          .in('product', productNames);

        let tmbQuery = supabase
          .from('tmb_transactions')
          .select('product, ticket_value')
          .eq('client_id', coprod.clientId)
          .in('product', productNames)
          .is('cancelled_at', null);

        let eduzzQuery = supabase
          .from('eduzz_transactions')
          .select('product, sale_value')
          .eq('client_id', coprod.clientId)
          .in('product', productNames)
          .eq('status', 'paid');

        if (dateFrom) {
          hotmartQuery = hotmartQuery.gte('purchase_date', dateFrom);
          tmbQuery = tmbQuery.gte('effective_date', dateFrom);
          eduzzQuery = eduzzQuery.gte('sale_date', dateFrom);
        }

        const [{ data: hotmart }, { data: tmb }, { data: eduzz }] = await Promise.all([
          hotmartQuery,
          tmbQuery,
          eduzzQuery,
        ]);

        // Aggregate sales by product per platform
        const salesMap = new Map<string, { hotmart: number; tmb: number; eduzz: number }>();
        productNames.forEach(p => salesMap.set(p, { hotmart: 0, tmb: 0, eduzz: 0 }));

        hotmart?.forEach(t => {
          if (t.product) {
            const s = salesMap.get(t.product);
            if (s) s.hotmart += Number(t.computed_value) || 0;
          }
        });

        tmb?.forEach(t => {
          if (t.product) {
            const s = salesMap.get(t.product);
            if (s) s.tmb += Number(t.ticket_value) || 0;
          }
        });

        eduzz?.forEach(t => {
          if (t.product) {
            const s = salesMap.get(t.product);
            if (s) s.eduzz += Number(t.sale_value) || 0;
          }
        });

        const products: ProductCommission[] = coprod.rates.map(rate => {
          const sales = salesMap.get(rate.product_name) || { hotmart: 0, tmb: 0, eduzz: 0 };
          const pct = rate.rate_percent / 100;
          const h = sales.hotmart * pct;
          const t = sales.tmb * pct;
          const e = sales.eduzz * pct;
          return {
            productName: rate.product_name,
            ratePercent: rate.rate_percent,
            hotmart: h,
            tmb: t,
            eduzz: e,
            total: h + t + e,
          };
        });

        const subtotal = products.reduce((sum, p) => sum + p.total, 0);

        results.push({
          clientId: coprod.clientId,
          clientName: coprod.clientName,
          products,
          subtotal,
        });
      }

      const grandTotal = results.reduce((sum, c) => sum + c.subtotal, 0);
      return { clients: results, grandTotal };
    },
    enabled: !!coproductions?.length,
  });
}
