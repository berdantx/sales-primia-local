import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, Goal } from '@/hooks/useGoals';
import { useTransactionStats } from '@/hooks/useTransactions';
import { useTmbTransactionStatsOptimized } from '@/hooks/useTmbTransactionStatsOptimized';
import { useEduzzTransactionStatsOptimized } from '@/hooks/useEduzzTransactionStatsOptimized';
import { useDollarRate } from '@/hooks/useDollarRate';
import { useFilter } from '@/contexts/FilterContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFinancialAccess } from '@/hooks/useFinancialAccess';
import { RestrictedFinancialSection } from '@/components/dashboard/RestrictedFinancialSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { calculateGoalProgress, formatCurrency, formatPercent } from '@/lib/calculations/goalCalculations';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActiveClientBlock } from '@/components/layout/ActiveClientBlock';
import { 
  Target, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Loader2,
  Clock,
  Flame,
  Package,
  Gem
} from 'lucide-react';

const CURRENCIES = ['BRL', 'USD', 'EUR'];

export default function Goals() {
  const { clientId, setClientId } = useFilter();
  const { isMaster } = useUserRole();
  const { canViewFinancials, isLoading: isLoadingFinancialAccess } = useFinancialAccess(clientId);
  const { data: goals, isLoading } = useGoals(clientId);
  const { stats: hotmartStats } = useTransactionStats({ clientId });
  const { data: tmbStats } = useTmbTransactionStatsOptimized({ clientId: clientId || undefined });
  const { data: eduzzStats } = useEduzzTransactionStatsOptimized({ clientId: clientId || undefined });
  const { data: dollarRate } = useDollarRate();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  
  // Combinar estatísticas de todas as plataformas
  const hotmartBRL = hotmartStats?.totalByCurrency?.['BRL'] || 0;
  const hotmartUSD = hotmartStats?.totalByCurrency?.['USD'] || 0;
  const tmbBRL = tmbStats?.totalBRL || 0;
  const eduzzBRL = eduzzStats?.totalBRL || 0;
  const usdConvertedBRL = dollarRate ? hotmartUSD * dollarRate.rate : 0;
  
  const combinedStats = {
    totalByCurrency: {
      BRL: hotmartBRL + tmbBRL + eduzzBRL,
      USD: hotmartUSD,
    },
    // Breakdown por plataforma
    breakdown: {
      hotmartBRL,
      hotmartUSD,
      tmbBRL,
      eduzzBRL,
      usdConvertedBRL,
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    target_value: '',
    currency: 'BRL',
    start_date: '',
    end_date: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      target_value: '',
      currency: 'BRL',
      start_date: '',
      end_date: '',
    });
    setEditingGoal(null);
  };

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        target_value: String(goal.target_value),
        currency: goal.currency,
        start_date: goal.start_date,
        end_date: goal.end_date,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      target_value: parseFloat(formData.target_value),
      currency: formData.currency,
      start_date: formData.start_date,
      end_date: formData.end_date,
      client_id: clientId,
    };

    if (editingGoal) {
      await updateGoal.mutateAsync({ id: editingGoal.id, ...data });
    } else {
      await createGoal.mutateAsync(data);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteGoal.mutateAsync(id);
  };

  const handleToggleActive = async (goal: Goal) => {
    await updateGoal.mutateAsync({ 
      id: goal.id, 
      is_active: !goal.is_active 
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

  const activeGoals = goals?.filter(g => g.is_active) || [];
  const inactiveGoals = goals?.filter(g => !g.is_active) || [];

  if (!canViewFinancials) {
    return (
      <MainLayout>
      <div className="space-y-6 sm:space-y-8">
          <div className="space-y-3">
            <ActiveClientBlock />
            <ClientContextHeader 
              title="Metas de Vendas"
              description="Defina e acompanhe suas metas de vendas"
            />
          </div>
          <RestrictedFinancialSection />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-3">
            <ActiveClientBlock />
            <ClientContextHeader 
              title="Metas de Vendas"
              description="Defina e acompanhe suas metas de vendas"
            />
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingGoal 
                      ? 'Atualize os dados da sua meta de vendas'
                      : 'Crie uma nova meta para acompanhar seu progresso'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Meta</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Meta Q1 2024"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_value">Valor Alvo</Label>
                      <Input
                        id="target_value"
                        type="number"
                        step="0.01"
                        placeholder="10000.00"
                        value={formData.target_value}
                        onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Moeda</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Data Início</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Data Fim</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createGoal.isPending || updateGoal.isPending}>
                      {(createGoal.isPending || updateGoal.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingGoal ? 'Salvar' : 'Criar Meta'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Metas Ativas
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeGoals.map((goal, index) => {
                // For BRL goals, include USD sales converted at current rate
                const baseTotalSold = combinedStats?.totalByCurrency[goal.currency as keyof typeof combinedStats.totalByCurrency] || 0;
                const totalSold = goal.currency === 'BRL' && dollarRate
                  ? baseTotalSold + ((combinedStats?.totalByCurrency['USD'] || 0) * dollarRate.rate)
                  : baseTotalSold;
                const progress = calculateGoalProgress(goal, totalSold);

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(goal.start_date), "dd/MM/yy", { locale: ptBR })} - {format(parseISO(goal.end_date), "dd/MM/yy", { locale: ptBR })}
                            </CardDescription>
                          </div>
                          <Badge variant={progress.isOnTrack ? 'default' : 'destructive'}>
                            {progress.isOnTrack ? (
                              <><TrendingUp className="h-3 w-3 mr-1" /> No ritmo</>
                            ) : (
                              <><TrendingDown className="h-3 w-3 mr-1" /> Atrasado</>
                            )}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">
                              {formatCurrency(progress.totalSold, goal.currency)}
                            </span>
                            <span className="text-muted-foreground">
                              {formatCurrency(goal.target_value, goal.currency)}
                            </span>
                          </div>
                          <Progress value={progress.progressPercent} className="h-3" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{formatPercent(progress.progressPercent)} concluído</span>
                            <span>Falta {formatCurrency(progress.remaining, goal.currency)}</span>
                          </div>
                        </div>

                        {/* Daily/Weekly/Monthly targets */}
                        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <p className="text-sm font-semibold text-primary">
                              {formatCurrency(progress.perDay, goal.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">por dia</p>
                          </div>
                          <div className="text-center border-x border-border">
                            <p className="text-sm font-semibold text-primary">
                              {formatCurrency(progress.perWeek, goal.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">por semana</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-primary">
                              {formatCurrency(progress.perMonth, goal.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">por mês</p>
                          </div>
                        </div>

                        {/* Platform Breakdown */}
                        {(combinedStats.breakdown.hotmartBRL > 0 || combinedStats.breakdown.tmbBRL > 0 || combinedStats.breakdown.eduzzBRL > 0) && (
                          <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Composição por Plataforma</p>
                            <div className="flex flex-wrap gap-2">
                              {combinedStats.breakdown.hotmartBRL > 0 && (
                                <div className="flex items-center gap-1.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full px-2 py-1">
                                  <Flame className="h-3 w-3" />
                                  <span className="font-medium">{formatCurrency(combinedStats.breakdown.hotmartBRL, 'BRL')}</span>
                                </div>
                              )}
                              {combinedStats.breakdown.tmbBRL > 0 && (
                                <div className="flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-1">
                                  <Package className="h-3 w-3" />
                                  <span className="font-medium">{formatCurrency(combinedStats.breakdown.tmbBRL, 'BRL')}</span>
                                </div>
                              )}
                              {combinedStats.breakdown.eduzzBRL > 0 && (
                                <div className="flex items-center gap-1.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-2 py-1">
                                  <Gem className="h-3 w-3" />
                                  <span className="font-medium">{formatCurrency(combinedStats.breakdown.eduzzBRL, 'BRL')}</span>
                                </div>
                              )}
                              {combinedStats.breakdown.usdConvertedBRL > 0 && (
                                <div className="flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full px-2 py-1">
                                  <span className="font-medium">USD: {formatCurrency(combinedStats.breakdown.usdConvertedBRL, 'BRL')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Time remaining */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{progress.daysRemaining} dias restantes</span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleActive(goal)}
                          >
                            Desativar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleOpenDialog(goal)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A meta será excluída permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(goal.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Goals */}
        {inactiveGoals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Metas Inativas
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {inactiveGoals.map((goal) => (
                <Card key={goal.id} className="opacity-60">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{goal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(goal.target_value, goal.currency)}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleActive(goal)}
                      >
                        Ativar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goals?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <Target className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma meta criada</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Crie sua primeira meta para acompanhar o progresso das suas vendas
              e saber quanto falta vender por dia, semana e mês.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Meta
            </Button>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
