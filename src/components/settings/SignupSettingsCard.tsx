import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserPlus, Loader2 } from 'lucide-react';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useUserRole } from '@/hooks/useUserRole';

export function SignupSettingsCard() {
  const { settings, isLoading, updateSettings, isUpdating } = useBrandingSettings();
  const { role } = useUserRole();

  // Only admin and master can see/edit this
  const canEdit = role === 'admin' || role === 'master';

  if (!canEdit) {
    return null;
  }

  const handleToggle = (checked: boolean) => {
    updateSettings({ signupEnabled: checked });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastro de Usuários
          </CardTitle>
          <CardDescription>
            Controle se novos usuários podem se cadastrar na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="signup-enabled" className="text-base">
                Permitir cadastro público
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, qualquer pessoa pode criar uma conta na página de login.
                Quando desativado, novos usuários só podem ser adicionados via convite.
              </p>
            </div>
            <Switch
              id="signup-enabled"
              checked={settings.signupEnabled}
              onCheckedChange={handleToggle}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}