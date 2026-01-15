import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LLMIntegrationsCard } from '@/components/settings/LLMIntegrationsCard';
import { ChangePasswordCard } from '@/components/settings/ChangePasswordCard';
import { BrandingSettingsCard } from '@/components/settings/BrandingSettingsCard';

export default function Settings() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isMaster = role === 'master';

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie sua conta e preferências
          </p>
        </motion.div>

        {/* Branding Settings - Only for Masters */}
        {isMaster && <BrandingSettingsCard />}

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil
              </CardTitle>
              <CardDescription>
                Suas informações de conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Membro desde</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {user?.created_at 
                      ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security - Change Password */}
        <ChangePasswordCard />

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
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
        </motion.div>

        {/* LLM Integrations */}
        <LLMIntegrationsCard />
      </div>
    </MainLayout>
  );
}
