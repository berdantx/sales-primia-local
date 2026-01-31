import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export interface ExportJob {
  id: string;
  user_id: string;
  client_id: string | null;
  export_type: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  file_path: string | null;
  file_name: string | null;
  total_records: number;
  progress: number;
  filters: Record<string, any>;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

// Threshold for marking stuck jobs as error (5 minutes)
const STUCK_JOB_THRESHOLD_MS = 5 * 60 * 1000;

export function useExportJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all export jobs for the current user
  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['export-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as ExportJob[];
    },
    enabled: !!user?.id,
    refetchInterval: (query) => {
      // Poll every 3 seconds if there are pending or processing jobs
      const jobs = query.state.data as ExportJob[] | undefined;
      const hasPendingJobs = jobs?.some(j => 
        j.status === 'pending' || j.status === 'processing'
      );
      return hasPendingJobs ? 3000 : 30000;
    },
  });

  // Auto-cleanup stuck jobs (processing for more than 5 minutes)
  useEffect(() => {
    const cleanupStuckJobs = async () => {
      const stuckJobs = jobs.filter(j => {
        if (j.status !== 'pending' && j.status !== 'processing') return false;
        const createdAt = new Date(j.created_at).getTime();
        return Date.now() - createdAt > STUCK_JOB_THRESHOLD_MS;
      });

      for (const job of stuckJobs) {
        console.log(`[ExportJobs] Marking stuck job ${job.id} as error`);
        await supabase
          .from('export_jobs')
          .update({
            status: 'error',
            error_message: 'Timeout: job cancelado automaticamente após 5 minutos',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }

      if (stuckJobs.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
      }
    };

    if (jobs.length > 0) {
      cleanupStuckJobs();
    }
  }, [jobs, queryClient]);

  // Count of ready jobs that haven't been downloaded
  const readyCount = jobs.filter(j => j.status === 'ready').length;
  
  // Count of pending/processing jobs
  const pendingCount = jobs.filter(j => 
    j.status === 'pending' || j.status === 'processing'
  ).length;

  // Get the currently processing job with its progress
  const processingJob = jobs.find(j => j.status === 'processing');

  // Start a new export job
  const startExport = useMutation({
    mutationFn: async (params: {
      clientId?: string;
      startDate?: Date;
      endDate?: Date;
      excludeTests?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('export-leads-background', {
        body: {
          clientId: params.clientId,
          startDate: params.startDate?.toISOString(),
          endDate: params.endDate?.toISOString(),
          excludeTests: params.excludeTests || false,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
    },
  });

  // Get signed URL for download
  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('exports')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  };

  // Delete an export job (and its file)
  const deleteJob = useMutation({
    mutationFn: async (job: ExportJob) => {
      // Delete file from storage if it exists
      if (job.file_path) {
        await supabase.storage
          .from('exports')
          .remove([job.file_path]);
      }

      // Delete job record
      const { error } = await supabase
        .from('export_jobs')
        .delete()
        .eq('id', job.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
    },
  });

  return {
    jobs,
    isLoading,
    readyCount,
    pendingCount,
    processingJob,
    startExport,
    getDownloadUrl,
    deleteJob,
    refetch,
  };
}
