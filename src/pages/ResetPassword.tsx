import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, KeyRound, Mail, CheckCircle } from 'lucide-react';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useTheme } from 'next-themes';
import defaultLogo from '@/assets/default-logo.png';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const { resetPassword, updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: branding } = useBrandingSettings();
  const { resolvedTheme } = useTheme();

  const currentLogo = (() => {
    const isDark = resolvedTheme === 'dark';
    if (isDark && branding.logoUrlDark) {
      return branding.logoUrlDark;
    }
    if (branding.logoUrl) {
      return branding.logoUrl;
    }
    return defaultLogo;
  })();

  // Check if user arrived via recovery link
  useEffect(() => {
    const checkRecoveryMode = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if this is a recovery session by looking at the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        if (type === 'recovery' || session) {
          setIsRecoveryMode(true);
        }
      }
    };
    
    checkRecoveryMode();
  }, [session]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, informe seu email.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEmailSent(true);
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha a nova senha e a confirmação.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao atualizar senha',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi alterada com sucesso.',
      });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-6 sm:mb-8 justify-center">
          <img 
            src={currentLogo} 
            alt={branding.appName} 
            className="h-8 w-auto object-contain"
          />
          <span className="text-xl sm:text-2xl font-bold">{branding.appName}</span>
        </div>

        <Card className="border-0 shadow-medium">
          <CardHeader className="space-y-1 pb-4 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <KeyRound className="h-6 w-6" />
              {isRecoveryMode ? 'Nova Senha' : 'Recuperar Senha'}
            </CardTitle>
            <CardDescription className="text-sm">
              {isRecoveryMode 
                ? 'Digite sua nova senha abaixo'
                : 'Informe seu email para receber o link de recuperação'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {emailSent && !isRecoveryMode ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <CheckCircle className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-medium">Email enviado!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao login
                </Button>
              </div>
            ) : isRecoveryMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Digite novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Atualizar senha
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Enviar link de recuperação
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
