import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useExternalWebhooks, 
  useWebhookDispatchLogs, 
  useCreateWebhook, 
  useUpdateWebhook, 
  useDeleteWebhook, 
  useTriggerWebhook,
  ExternalWebhook,
} from '@/hooks/useExternalWebhooks';
import { Loader2, Plus, Send, Trash2, Edit2, CheckCircle, XCircle, Clock, Webhook, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WebhookConfig() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ExternalWebhook | null>(null);
  const [selectedWebhookForLogs, setSelectedWebhookForLogs] = useState<string | undefined>();
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    schedule: '',
  });

  const { data: webhooks, isLoading: isLoadingWebhooks } = useExternalWebhooks();
  const { data: dispatchLogs, isLoading: isLoadingLogs } = useWebhookDispatchLogs(selectedWebhookForLogs);
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const triggerWebhook = useTriggerWebhook();

  const resetForm = () => {
    setFormData({ name: '', url: '', schedule: '' });
    setEditingWebhook(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (webhook: ExternalWebhook) => {
    setFormData({
      name: webhook.name,
      url: webhook.url,
      schedule: webhook.schedule || '',
    });
    setEditingWebhook(webhook);
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.url.trim()) return;

    try {
      if (editingWebhook) {
        await updateWebhook.mutateAsync({
          id: editingWebhook.id,
          name: formData.name,
          url: formData.url,
          schedule: formData.schedule || null,
        });
      } else {
        await createWebhook.mutateAsync({
          name: formData.name,
          url: formData.url,
          schedule: formData.schedule || null,
        });
      }
      setIsCreateDialogOpen(false);
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleActive = async (webhook: ExternalWebhook) => {
    await updateWebhook.mutateAsync({
      id: webhook.id,
      is_active: !webhook.is_active,
    });
  };

  const handleTrigger = async (webhookId: string) => {
    await triggerWebhook.mutateAsync(webhookId);
  };

  const handleDelete = async (webhookId: string) => {
    await deleteWebhook.mutateAsync(webhookId);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getScheduleLabel = (schedule: string | null) => {
    if (!schedule) return 'Manual';
    const scheduleMap: Record<string, string> = {
      '0 23 * * *': 'Diário (23:00)',
      '0 8 * * *': 'Diário (08:00)',
      '0 12 * * *': 'Diário (12:00)',
      '0 18 * * *': 'Diário (18:00)',
      '0 9 * * 1': 'Semanal (Seg 09:00)',
      '0 9 1 * *': 'Mensal (Dia 1)',
    };
    return scheduleMap[schedule] || schedule;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Webhooks Externos</h1>
            <p className="text-muted-foreground mt-1">
              Configure webhooks para enviar resumos de vendas automaticamente
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}</DialogTitle>
                <DialogDescription>
                  Configure um webhook para receber resumos de vendas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Notificação Slack"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL do Webhook</Label>
                  <Input
                    id="url"
                    placeholder="https://hooks.example.com/webhook"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule">Agendamento</Label>
                  <Select
                    value={formData.schedule}
                    onValueChange={(value) => setFormData({ ...formData, schedule: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um agendamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Manual (sem agendamento)</SelectItem>
                      <SelectItem value="0 8 * * *">Diário às 08:00</SelectItem>
                      <SelectItem value="0 12 * * *">Diário às 12:00</SelectItem>
                      <SelectItem value="0 18 * * *">Diário às 18:00</SelectItem>
                      <SelectItem value="0 23 * * *">Diário às 23:00</SelectItem>
                      <SelectItem value="0 9 * * 1">Semanal (Segunda 09:00)</SelectItem>
                      <SelectItem value="0 9 1 * *">Mensal (Dia 1 às 09:00)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Agendamentos automáticos serão implementados em breve. Por enquanto, use o disparo manual.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.name.trim() || !formData.url.trim() || createWebhook.isPending || updateWebhook.isPending}
                >
                  {(createWebhook.isPending || updateWebhook.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingWebhook ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            {isLoadingWebhooks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : webhooks?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum webhook configurado</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crie um webhook para enviar resumos de vendas para serviços externos
                  </p>
                  <Button onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {webhooks?.map((webhook) => (
                  <Card key={webhook.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg">{webhook.name}</CardTitle>
                            <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                              {webhook.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant="outline">
                              {getScheduleLabel(webhook.schedule)}
                            </Badge>
                          </div>
                          <CardDescription className="break-all">
                            {webhook.url}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={() => handleToggleActive(webhook)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Último disparo: {formatDate(webhook.last_triggered_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTrigger(webhook.id)}
                            disabled={!webhook.is_active || triggerWebhook.isPending}
                          >
                            {triggerWebhook.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Disparar Agora
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(webhook)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O webhook "{webhook.name}" será excluído permanentemente junto com seu histórico de disparos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(webhook.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Histórico de Disparos</CardTitle>
                    <CardDescription>Últimos 50 disparos de webhooks</CardDescription>
                  </div>
                  <Select
                    value={selectedWebhookForLogs || 'all'}
                    onValueChange={(value) => setSelectedWebhookForLogs(value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por webhook" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os webhooks</SelectItem>
                      {webhooks?.map((webhook) => (
                        <SelectItem key={webhook.id} value={webhook.id}>
                          {webhook.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : dispatchLogs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum disparo registrado ainda
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead>Webhook</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="hidden sm:table-cell">Erro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispatchLogs?.map((log) => {
                          const webhook = webhooks?.find(w => w.id === log.webhook_id);
                          return (
                            <TableRow key={log.id}>
                              <TableCell>
                                {log.status === 'success' ? (
                                  <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Erro
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {webhook?.name || 'Webhook removido'}
                              </TableCell>
                              <TableCell>{log.response_code || '-'}</TableCell>
                              <TableCell>{formatDate(log.created_at)}</TableCell>
                              <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                                {log.error_message || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payload Example Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formato do Payload</CardTitle>
            <CardDescription>
              Exemplo do JSON enviado para o webhook configurado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "date": "2025-12-15",
  "timestamp": "2025-12-15T14:30:00Z",
  "sales_today": {
    "total_brl": 15420.50,
    "total_usd": 1250.00,
    "transactions_count": 45
  },
  "sales_by_platform": {
    "hotmart": {
      "total_brl": 12500.00,
      "total_usd": 1250.00,
      "transactions": 35
    },
    "tmb": {
      "total_brl": 2920.50,
      "transactions": 10
    }
  },
  "goals": {
    "active_goal": "Meta Janeiro 2025",
    "target_value": 500000.00,
    "currency": "BRL",
    "current_progress": 125000.00,
    "progress_percent": 25.0,
    "remaining": {
      "total": 375000.00,
      "per_day": 12500.00,
      "per_week": 87500.00,
      "per_month": 375000.00
    },
    "time_remaining": {
      "days": 30,
      "weeks": 5,
      "months": 1
    }
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}