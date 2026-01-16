import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInvitationHistory } from "@/hooks/useInvitationHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Mail, 
  RefreshCw, 
  CheckCircle, 
  Trash2, 
  Clock,
  User
} from "lucide-react";

interface InvitationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitationId: string | null;
  email: string;
}

const actionConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: {
    icon: Mail,
    label: "Convite enviado",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  resent: {
    icon: RefreshCw,
    label: "Convite reenviado",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  accepted: {
    icon: CheckCircle,
    label: "Convite aceito",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  deleted: {
    icon: Trash2,
    label: "Convite excluído",
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  expired: {
    icon: Clock,
    label: "Convite expirado",
    color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
};

export function InvitationHistoryDialog({
  open,
  onOpenChange,
  invitationId,
  email,
}: InvitationHistoryDialogProps) {
  const { data: history, isLoading } = useInvitationHistory(invitationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico do Convite
          </DialogTitle>
          <DialogDescription>
            Histórico de ações para o convite de <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico disponível
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => {
                const config = actionConfig[item.action] || {
                  icon: Clock,
                  label: item.action,
                  color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
                };
                const Icon = config.icon;

                return (
                  <div
                    key={item.id}
                    className="relative flex gap-3 pb-4"
                  >
                    {/* Timeline line */}
                    {index < history.length - 1 && (
                      <div className="absolute left-4 top-8 w-px h-full -translate-x-1/2 bg-border" />
                    )}
                    
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color} border`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        {item.email_sent && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            <Mail className="h-3 w-3 mr-1" />
                            Email enviado
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </p>
                      
                      {item.notes && (
                        <p className="text-sm mt-1">{item.notes}</p>
                      )}
                      
                      {item.new_expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nova expiração: {format(new Date(item.new_expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
