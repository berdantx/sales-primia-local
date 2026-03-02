import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useClients, Client } from '@/hooks/useClients';
import { useClientManagement } from '@/hooks/useClientManagement';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ClientUsersDialog } from '@/components/clients/ClientUsersDialog';
import { ClientWebhookDialog } from '@/components/clients/ClientWebhookDialog';
import { ClientCoproducersDialog } from '@/components/clients/ClientCoproducersDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Building2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

function Clients() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [managingUsersClient, setManagingUsersClient] = useState<Client | null>(null);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookClient, setWebhookClient] = useState<Client | null>(null);
  const [coproducersDialogOpen, setCoproducersDialogOpen] = useState(false);
  const [coproducersClient, setCoproducersClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useClients();
  const { createClient, updateClient, toggleClientStatus } = useClientManagement();

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.slug.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleOpenCreate = () => {
    setEditingClient(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleManageUsers = (client: Client) => {
    setManagingUsersClient(client);
    setUsersDialogOpen(true);
  };

  const handleShowWebhook = (client: Client) => {
    setWebhookClient(client);
    setWebhookDialogOpen(true);
  };

  const handleManageCoproducers = (client: Client) => {
    setCoproducersClient(client);
    setCoproducersDialogOpen(true);
  };

  const handleSubmit = async (data: { name: string; slug: string; logo_url?: string }) => {
    if (editingClient) {
      await updateClient.mutateAsync({
        id: editingClient.id,
        ...data,
      });
    } else {
      await createClient.mutateAsync(data);
    }
    setDialogOpen(false);
    setEditingClient(null);
  };

  const handleToggleStatus = (client: Client) => {
    toggleClientStatus.mutate({
      id: client.id,
      is_active: !client.is_active,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" strokeWidth={1.75} />
              Gestão de Clientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {clients?.length || 0} clientes cadastrados
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/webhook-docs">
                <BookOpen className="h-4 w-4 mr-2" />
                Documentação
              </Link>
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientsTable
              clients={filteredClients}
              onEdit={handleOpenEdit}
              onToggleStatus={handleToggleStatus}
              onManageUsers={handleManageUsers}
              onShowWebhook={handleShowWebhook}
              onManageCoproducers={handleManageCoproducers}
              isToggling={toggleClientStatus.isPending}
            />
          </CardContent>
        </Card>
      </div>

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingClient(null);
        }}
        client={editingClient}
        onSubmit={handleSubmit}
        isLoading={createClient.isPending || updateClient.isPending}
      />

      <ClientUsersDialog
        open={usersDialogOpen}
        onOpenChange={(open) => {
          setUsersDialogOpen(open);
          if (!open) setManagingUsersClient(null);
        }}
        client={managingUsersClient}
      />

      <ClientWebhookDialog
        open={webhookDialogOpen}
        onOpenChange={(open) => {
          setWebhookDialogOpen(open);
          if (!open) setWebhookClient(null);
        }}
        client={webhookClient}
      />

      <ClientCoproducersDialog
        open={coproducersDialogOpen}
        onOpenChange={(open) => {
          setCoproducersDialogOpen(open);
          if (!open) setCoproducersClient(null);
        }}
        client={coproducersClient}
      />
    </MainLayout>
  );
}

export default Clients;
