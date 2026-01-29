import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Download, Loader2, Trash2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useExportJobs, ExportJob } from '@/hooks/useExportJobs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function NotificationsDropdown() {
  const { jobs, readyCount, pendingCount, getDownloadUrl, deleteJob } = useExportJobs();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const hasNotifications = readyCount > 0 || pendingCount > 0;
  const totalBadge = readyCount;

  const handleDownload = async (job: ExportJob) => {
    if (!job.file_path) return;

    setDownloadingId(job.id);
    try {
      const url = await getDownloadUrl(job.file_path);
      if (url) {
        // Create a link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = job.file_name || 'export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Download iniciado!');
      } else {
        toast.error('Erro ao gerar link de download');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (job: ExportJob) => {
    try {
      await deleteJob.mutateAsync(job);
      toast.success('Exportação removida');
    } catch (error) {
      toast.error('Erro ao remover exportação');
    }
  };

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusText = (status: ExportJob['status']) => {
    switch (status) {
      case 'pending':
        return 'Na fila';
      case 'processing':
        return 'Processando...';
      case 'ready':
        return 'Pronto para download';
      case 'error':
        return 'Erro';
    }
  };

  const formatJobDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  // Show only recent jobs (last 10)
  const recentJobs = jobs.slice(0, 10);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {totalBadge > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalBadge > 9 ? '9+' : totalBadge}
            </Badge>
          )}
          {pendingCount > 0 && totalBadge === 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Exportações</span>
          {pendingCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {pendingCount} em processamento
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {recentJobs.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma exportação recente</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {recentJobs.map((job) => (
              <DropdownMenuItem
                key={job.id}
                className={cn(
                  "flex flex-col items-start gap-1 py-3 cursor-default",
                  job.status === 'ready' && "bg-green-50 dark:bg-green-950/20"
                )}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className="font-medium text-sm">
                      {job.export_type === 'leads' ? 'Leads' : job.export_type}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatJobDate(job.created_at)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between w-full mt-1">
                  <span className="text-xs text-muted-foreground">
                    {job.status === 'ready' && job.total_records > 0 
                      ? `${job.total_records.toLocaleString('pt-BR')} registros`
                      : getStatusText(job.status)
                    }
                    {job.status === 'error' && job.error_message && (
                      <span className="text-destructive"> - {job.error_message}</span>
                    )}
                  </span>
                  
                  <div className="flex gap-1">
                    {job.status === 'ready' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDownload(job)}
                        disabled={downloadingId === job.id}
                      >
                        {downloadingId === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    )}
                    {(job.status === 'ready' || job.status === 'error') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(job)}
                        disabled={deleteJob.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
