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
import { Textarea } from '@/components/ui/textarea';
import { 
  useExternalWebhooks, 
  useWebhookDispatchLogs, 
  useCreateWebhook, 
  useUpdateWebhook, 
  useDeleteWebhook, 
  useTriggerWebhook,
  ExternalWebhook,
} from '@/hooks/useExternalWebhooks';
import { Loader2, Plus, Send, Trash2, Edit2, CheckCircle, XCircle, Clock, Webhook, History, Eye } from 'lucide-react';
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
    custom_text_start: '',
    custom_text_end: '',
  });

  const { data: webhooks, isLoading: isLoadingWebhooks } = useExternalWebhooks();
  const { data: dispatchLogs, isLoading: isLoadingLogs } = useWebhookDispatchLogs(selectedWebhookForLogs);
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const triggerWebhook = useTriggerWebhook();

  const resetForm = () => {
    setFormData({ name: '', url: '', schedule: '', custom_text_start: '', custom_text_end: '' });
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
      custom_text_start: webhook.custom_text_start || '',
      custom_text_end: webhook.custom_text_end || '',
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
          custom_text_start: formData.custom_text_start || null,
          custom_text_end: formData.custom_text_end || null,
        });
      } else {
        await createWebhook.mutateAsync({
          name: formData.name,
          url: formData.url,
          schedule: formData.schedule || null,
          custom_text_start: formData.custom_text_start || null,
          custom_text_end: formData.custom_text_end || null,
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
                    value={formData.schedule || 'manual'}
                    onValueChange={(value) => setFormData({ ...formData, schedule: value === 'manual' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um agendamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (sem agendamento)</SelectItem>
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
                <div className="space-y-2">
                  <Label htmlFor="custom_text_start">Texto Personalizado (Início)</Label>
                  <Textarea
                    id="custom_text_start"
                    placeholder="Ex: 🚀 Bom dia equipe! Segue o resumo de vendas:"
                    value={formData.custom_text_start}
                    onChange={(e) => setFormData({ ...formData, custom_text_start: e.target.value })}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este texto aparecerá no início do payload
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_text_end">Texto Personalizado (Final)</Label>
                  <Textarea
                    id="custom_text_end"
                    placeholder="Ex: 📞 Dúvidas? Entre em contato com o time comercial!"
                    value={formData.custom_text_end}
                    onChange={(e) => setFormData({ ...formData, custom_text_end: e.target.value })}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este texto aparecerá no final do payload
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

        {/* Payload Preview Card */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do Payload
            </CardTitle>
            <CardDescription>
              Visualize como ficará a mensagem enviada para o webhook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 font-mono text-xs space-y-3 overflow-x-auto">
              {formData.custom_text_start && (
                <div className="text-blue-500 font-semibold">{formData.custom_text_start}</div>
              )}
              
              <div className="text-foreground font-semibold">📊 Resumo de Vendas - 15/12/2025</div>
              
              <div className="space-y-1">
                <div className="text-orange-500 font-semibold">🔥 HOTMART</div>
                <div className="text-muted-foreground pl-4">Vendas realizadas hoje: 43</div>
                <div className="text-muted-foreground pl-4">Valor em Reais: R$ 17.986,99</div>
                <div className="text-muted-foreground pl-4">Valor em Dólares: US$ 0,00</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-purple-500 font-semibold">💳 TMB</div>
                <div className="text-muted-foreground pl-4">Vendas realizadas hoje: 5</div>
                <div className="text-muted-foreground pl-4">Valor em Reais: R$ 2.450,00</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-green-500 font-semibold">📈 TOTAL CONSOLIDADO</div>
                <div className="text-muted-foreground pl-4">Total de vendas hoje: 48</div>
                <div className="text-muted-foreground pl-4">Total em Reais: R$ 20.436,99</div>
                <div className="text-muted-foreground pl-4">Total em Dólares: US$ 0,00</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-yellow-500 font-semibold">🎯 META: Geral</div>
                <div className="text-muted-foreground pl-4">Meta Global: R$ 8.000.000,00</div>
                <div className="text-muted-foreground pl-4">Meta Alcançada: R$ 3.778.594,77 (47,23%)</div>
                <div className="text-muted-foreground pl-4">Falta: R$ 4.221.405,23</div>
                <div className="text-muted-foreground pl-4">Meta Diária: R$ 263.837,83</div>
                <div className="text-muted-foreground pl-4">⏱️ Tempo restante: 16 dias</div>
              </div>
              
              {formData.custom_text_end && (
                <div className="text-green-500 font-semibold">{formData.custom_text_end}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payload JSON Example Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formato do Payload JSON</CardTitle>
            <CardDescription>
              Estrutura completa do JSON enviado para o webhook configurado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "date": "15/12/2025",
  "timestamp": "2025-12-15T14:30:00Z",
  "custom_text_start": ${formData.custom_text_start ? `"${formData.custom_text_start}"` : 'null'},
  "custom_text_end": ${formData.custom_text_end ? `"${formData.custom_text_end}"` : 'null'},
  "message": {
    "custom_intro": ${formData.custom_text_start ? `"${formData.custom_text_start}"` : 'null'},
    "title": "📊 Resumo de Vendas - 15/12/2025",
    "hotmart": {
      "header": "🔥 HOTMART",
      "transactions": "Vendas realizadas hoje: 43",
      "total_brl": "Valor em Reais: R$ 17.986,99",
      "total_usd": "Valor em Dólares: US$ 0,00"
    },
    "tmb": { ... },
    "combined": { ... },
    "goals": { ... },
    "custom_outro": ${formData.custom_text_end ? `"${formData.custom_text_end}"` : 'null'}
  },
  "raw_data": {
    "sales_today": { "total_brl": 17986.99, "total_usd": 0, ... },
    "sales_by_platform": { ... },
    "goals": { ... }
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}