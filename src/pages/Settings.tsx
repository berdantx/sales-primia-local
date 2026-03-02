import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrencyAlerts } from '@/hooks/useCurrencyAlerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Calendar, Shield, Palette, Settings2, Coins, Plug, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { LLMIntegrationsCard } from '@/components/settings/LLMIntegrationsCard';
import { ChangePasswordCard } from '@/components/settings/ChangePasswordCard';
import { BrandingSettingsCard } from '@/components/settings/BrandingSettingsCard';
import { SignupSettingsCard } from '@/components/settings/SignupSettingsCard';
import { BackupCard } from '@/components/settings/BackupCard';
import { TransactionAuditCard } from '@/components/audit/TransactionAuditCard';
import { CurrencyOverviewCard } from '@/components/settings/CurrencyOverviewCard';
import { CurrencyAlertsCard } from '@/components/settings/CurrencyAlertsCard';

const roleLabels: Record<string, string> = {
  master: 'Master',
  admin: 'Admin',
  user: 'Usuário',
};

export default function Settings() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { totalPending } = useCurrencyAlerts();
  const [searchParams, setSearchParams] = useSearchParams();

  const isMasterOrAdmin = role === 'master' || role === 'admin';
  const isMaster = role === 'master';

  const tabs = useMemo(() => {
    const all = [
      { value: 'conta', label: 'Conta', icon: User, visible: true },
      { value: 'aparencia', label: 'Aparência', icon: Palette, visible: isMaster },
      { value: 'sistema', label: 'Sistema', icon: Settings2, visible: isMasterOrAdmin },
      { value: 'moedas', label: 'Moedas', icon: Coins, visible: isMasterOrAdmin, badge: totalPending },
      { value: 'integracoes', label: 'Integrações', icon: Plug, visible: isMasterOrAdmin },
      { value: 'sobre', label: 'Sobre', icon: Info, visible: true },
    ];
    return all.filter(t => t.visible);
  }, [isMaster, isMasterOrAdmin, totalPending]);

  const activeTab = searchParams.get('tab') || tabs[0]?.value || 'conta';
  const validTab = tabs.find(t => t.value === activeTab) ? activeTab : tabs[0]?.value || 'conta';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie sua conta e preferências
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {roleLabels[role] || role}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={validTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge ? (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {tab.badge}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={validTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Conta */}
              <TabsContent value="conta" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Perfil
                    </CardTitle>
                    <CardDescription>Suas informações de conta</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" value={user?.email || ''} disabled className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Membro desde</Label>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {user?.created_at
                            ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <ChangePasswordCard />
              </TabsContent>

              {/* Aparência */}
              {isMaster && (
                <TabsContent value="aparencia" className="space-y-6 mt-4">
                  <BrandingSettingsCard />
                </TabsContent>
              )}

              {/* Sistema */}
              {isMasterOrAdmin && (
                <TabsContent value="sistema" className="space-y-6 mt-4">
                  <SignupSettingsCard />
                  <BackupCard />
                  <TransactionAuditCard />
                </TabsContent>
              )}

              {/* Moedas */}
              {isMasterOrAdmin && (
                <TabsContent value="moedas" className="space-y-6 mt-4">
                  <CurrencyOverviewCard />
                  <CurrencyAlertsCard />
                </TabsContent>
              )}

              {/* Integrações */}
              {isMasterOrAdmin && (
                <TabsContent value="integracoes" className="space-y-6 mt-4">
                  <LLMIntegrationsCard />
                </TabsContent>
              )}

              {/* Sobre */}
              <TabsContent value="sobre" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Sobre o App
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Versão</span>
                      <Badge variant="secondary">1.0.0 MVP</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Template Suportado</span>
                      <Badge>Vendas Hotmart</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Moedas Suportadas</span>
                      <div className="flex gap-1">
                        <Badge variant="outline">BRL</Badge>
                        <Badge variant="outline">USD</Badge>
                        <Badge variant="outline">EUR</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </MainLayout>
  );
}
