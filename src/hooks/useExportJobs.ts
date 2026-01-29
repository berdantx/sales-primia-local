import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ExportJob {
  id: string;
  user_id: string;
  client_id: string | null;
  export_type: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  file_path: string | null;
  file_name: string | null;
  total_records: number;
  filters: Record<string, any>;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

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
      // Poll every 5 seconds if there are pending or processing jobs
      const jobs = query.state.data as ExportJob[] | undefined;
      const hasPendingJobs = jobs?.some(j => 
        j.status === 'pending' || j.status === 'processing'
      );
      return hasPendingJobs ? 5000 : 30000;
    },
  });

  // Count of ready jobs that haven't been downloaded
  const readyCount = jobs.filter(j => j.status === 'ready').length;
  
  // Count of pending/processing jobs
  const pendingCount = jobs.filter(j => 
    j.status === 'pending' || j.status === 'processing'
  ).length;

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
    startExport,
    getDownloadUrl,
    deleteJob,
    refetch,
  };
}
