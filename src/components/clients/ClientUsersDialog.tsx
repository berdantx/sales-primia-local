import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Plus, Trash2, Crown, User, UserPlus, DollarSign } from 'lucide-react';
import { 
  useClientUsers, 
  useAvailableUsers, 
  useAddUserToClient, 
  useRemoveUserFromClient,
  useUpdateClientUserOwnership,
  useUpdateFinancialAccess,
  ClientUser
} from '@/hooks/useClientUsers';
import { Client } from '@/hooks/useClients';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientUsersDialog({ open, onOpenChange, client }: ClientUsersDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);

  const { data: clientUsers, isLoading } = useClientUsers(client?.id || null);
  const { data: availableUsers } = useAvailableUsers();
  const addUser = useAddUserToClient();
  const removeUser = useRemoveUserFromClient();
  const updateOwnership = useUpdateClientUserOwnership();
  const updateFinancialAccess = useUpdateFinancialAccess();

  // Filter out users already associated with the client
  const usersNotInClient = availableUsers?.filter(
    user => !clientUsers?.some(cu => cu.user_id === user.user_id)
  ) || [];

  const handleAddUser = async () => {
    if (!client || !selectedUserId) return;
    
    await addUser.mutateAsync({
      clientId: client.id,
      userId: selectedUserId,
      isOwner,
    });
    
    setSelectedUserId('');
    setIsOwner(false);
  };

  const handleRemoveUser = async (clientUser: ClientUser) => {
    if (!client) return;
    await removeUser.mutateAsync({ id: clientUser.id, clientId: client.id });
  };

  const handleToggleOwnership = async (clientUser: ClientUser) => {
    if (!client) return;
    await updateOwnership.mutateAsync({ 
      id: clientUser.id, 
      clientId: client.id, 
      isOwner: !clientUser.is_owner 
    });
  };

  const handleToggleFinancialAccess = async (clientUser: ClientUser) => {
    if (!client) return;
    await updateFinancialAccess.mutateAsync({
      id: clientUser.id,
      clientId: client.id,
      canViewFinancials: !clientUser.can_view_financials,
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Usuários do Cliente</DialogTitle>
          <DialogDescription>
            Gerencie os usuários associados a {client?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add User Section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Usuário
            </h4>
            <div className="space-y-3">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {usersNotInClient.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Todos os usuários já estão associados
                    </div>
                  ) : (
                    usersNotInClient.map(user => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || 'Sem nome'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-owner"
                    checked={isOwner}
                    onCheckedChange={setIsOwner}
                  />
                  <Label htmlFor="is-owner" className="text-sm">Definir como owner</Label>
                </div>
                <Button 
                  onClick={handleAddUser} 
                  disabled={!selectedUserId || addUser.isPending}
                  size="sm"
                >
                  {addUser.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Usuários Associados ({clientUsers?.length || 0})</h4>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : clientUsers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário associado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {clientUsers?.map((clientUser) => (
                  <div 
                    key={clientUser.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(clientUser.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {clientUser.profile?.full_name || 'Usuário sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {clientUser.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {clientUser.is_owner && (
                        <Badge variant="secondary" className="gap-1">
                          <Crown className="h-3 w-3" />
                          Owner
                        </Badge>
                      )}
                      {clientUser.can_view_financials && (
                        <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600">
                          <DollarSign className="h-3 w-3" />
                          Financeiro
                        </Badge>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFinancialAccess(clientUser)}
                              disabled={updateFinancialAccess.isPending}
                              className={clientUser.can_view_financials ? 'text-green-600' : 'text-muted-foreground'}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {clientUser.can_view_financials 
                              ? 'Remover acesso financeiro' 
                              : 'Liberar acesso financeiro'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleOwnership(clientUser)}
                              disabled={updateOwnership.isPending}
                            >
                              <Crown className={`h-4 w-4 ${clientUser.is_owner ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {clientUser.is_owner ? 'Remover owner' : 'Promover a owner'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário perderá acesso a este cliente e seus dados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveUser(clientUser)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
