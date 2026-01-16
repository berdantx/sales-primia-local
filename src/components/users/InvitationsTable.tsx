import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, XCircle, Building2, RefreshCw, Trash2, Loader2, History } from 'lucide-react';
import { InvitationHistoryDialog } from './InvitationHistoryDialog';

interface Invitation {
  id: string;
  email: string;
  status: string;
  role: string;
  created_at: string;
  expires_at: string;
  client_id: string | null;
  clients: { name: string } | null;
}

interface InvitationsTableProps {
  invitations: Invitation[] | undefined;
  isLoading: boolean;
  onResend?: (invitationId: string) => void;
  onDelete?: (invitationId: string) => void;
  isResending?: boolean;
  isDeleting?: boolean;
}

export function InvitationsTable({ 
  invitations, 
  isLoading, 
  onResend, 
  onDelete,
  isResending,
  isDeleting 
}: InvitationsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedForHistory, setSelectedForHistory] = useState<{ id: string; email: string } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum convite enviado
      </div>
    );
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aceito
        </Badge>
      );
    }
    
    if (isExpired || status === 'expired') {
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const canResend = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    return status !== 'accepted' && (status === 'pending' || isExpired);
  };

  const canDelete = (status: string) => {
    return status !== 'accepted';
  };

  const handleDeleteClick = (invitationId: string) => {
    setSelectedInvitationId(invitationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedInvitationId && onDelete) {
      onDelete(selectedInvitationId);
    }
    setDeleteDialogOpen(false);
    setSelectedInvitationId(null);
  };

  const handleHistoryClick = (invitation: Invitation) => {
    setSelectedForHistory({ id: invitation.id, email: invitation.email });
    setHistoryDialogOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enviado em</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell>
                {invitation.clients?.name ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {invitation.clients.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {getStatusBadge(invitation.status, invitation.expires_at)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(invitation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(invitation.expires_at), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleHistoryClick(invitation)}
                    title="Ver histórico"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  {canResend(invitation.status, invitation.expires_at) && onResend && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResend(invitation.id)}
                      disabled={isResending}
                      title="Reenviar convite"
                    >
                      {isResending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {canDelete(invitation.status) && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(invitation.id)}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive"
                      title="Excluir convite"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este convite? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvitationHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        invitationId={selectedForHistory?.id || null}
        email={selectedForHistory?.email || ""}
      />
    </>
  );
}
