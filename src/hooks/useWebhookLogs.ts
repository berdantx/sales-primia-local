import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WebhookLog {
  id: string;
  user_id: string;
  event_type: string;
  transaction_code: string | null;
  status: 'processed' | 'skipped' | 'error';
  payload: unknown;
  error_message: string | null;
  created_at: string;
}

export interface WebhookLogsFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  clientId?: string | null;
}

export interface WebhookStats {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
}

export function useWebhookLogs(filters: WebhookLogsFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['webhook-logs', user?.id, filters],
    queryFn: async (): Promise<WebhookLog[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      if (filters.search) {
        query = query.or(`transaction_code.ilike.%${filters.search}%,event_type.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.limit(500);

      if (error) {
        console.error('Error fetching webhook logs:', error);
        throw error;
      }

      return (data || []) as WebhookLog[];
    },
    enabled: !!user?.id,
  });
}

export function useWebhookStats(filters: WebhookLogsFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['webhook-stats', user?.id, filters],
    queryFn: async (): Promise<WebhookStats> => {
      if (!user?.id) {
        return { total: 0, processed: 0, skipped: 0, errors: 0 };
      }

      let query = supabase
        .from('webhook_logs')
        .select('status', { count: 'exact' });

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching webhook stats:', error);
        throw error;
      }

      const stats: WebhookStats = {
        total: data?.length || 0,
        processed: 0,
        skipped: 0,
        errors: 0,
      };

      data?.forEach((item: { status: string }) => {
        if (item.status === 'processed') stats.processed++;
        else if (item.status === 'skipped') stats.skipped++;
        else if (item.status === 'error') stats.errors++;
      });

      return stats;
    },
    enabled: !!user?.id,
  });
}
