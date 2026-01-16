import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Target, ArrowRight, Loader2, Users, Zap, Eye, EyeOff } from 'lucide-react';
import { suggestDomainCorrection, EmailSuggestion as EmailSuggestionType } from '@/lib/emailValidator';
import { EmailSuggestion } from '@/components/auth/EmailSuggestion';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useTheme } from 'next-themes';
import defaultLogo from '@/assets/default-logo.png';

const features = [
  {
    icon: TrendingUp,
    title: 'Dashboard Multi-Plataforma',
    description: 'Hotmart, TMB e Eduzz unificados em um só lugar'
  },
  {
    icon: Target,
    title: 'Gestão de Metas Inteligente',
    description: 'Projeções automáticas e acompanhamento visual'
  },
  {
    icon: Users,
    title: 'Gestão de Leads Completa',
    description: 'Rastreamento de UTMs e análise de campanhas'
  },
  {
    icon: Zap,
    title: 'Automações e Webhooks',
    description: 'Resumos automáticos para Slack, Discord e CRMs'
  }
];

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<EmailSuggestionType | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: branding } = useBrandingSettings();
  const { resolvedTheme } = useTheme();

  const currentLogo = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    if (isDark && branding.logoUrlDark) {
      return branding.logoUrlDark;
    }
    if (branding.logoUrl) {
      return branding.logoUrl;
    }
    return defaultLogo;
  }, [branding, resolvedTheme]);

  // Verifica sugestão de email com debounce
  const checkEmailSuggestion = useCallback((value: string) => {
    if (suggestionDismissed) return;
    const suggestion = suggestDomainCorrection(value);
    setEmailSuggestion(suggestion);
  }, [suggestionDismissed]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setSuggestionDismissed(false);
    
    // Debounce para não verificar a cada tecla
    const timeoutId = setTimeout(() => {
      checkEmailSuggestion(value);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const acceptSuggestion = () => {
    if (emailSuggestion) {
      setEmail(emailSuggestion.suggestedEmail);
      setEmailSuggestion(null);
      toast({
        title: 'Email corrigido',
        description: `Email alterado para ${emailSuggestion.suggestedEmail}`,
      });
    }
  };

  const dismissSuggestion = () => {
    setEmailSuggestion(null);
    setSuggestionDismissed(true);
  };

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha email e senha.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos.' 
          : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha email e senha.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já está registrado. Tente fazer login.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao cadastrar',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você já pode começar a usar o sistema.',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-center px-8 xl:px-12 text-primary-foreground">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-10">
              <img 
                src={currentLogo} 
                alt={branding.appName} 
                className="h-12 w-auto object-contain brightness-0 invert"
              />
            </div>
            
            <h2 className="text-3xl font-bold mb-4">{branding.appName}</h2>
            
            <h1 className="text-4xl font-bold mb-6 leading-tight">
              Inteligência de Vendas<br />para Infoprodutores
            </h1>
            
            <p className="text-lg opacity-90 mb-12 max-w-md">
              Centralize dados de múltiplas plataformas, acompanhe metas em tempo real 
              e tome decisões baseadas em dados.
            </p>

            <div className="space-y-5">
              {features.map((feature, index) => (
                <motion.div 
                  key={feature.title}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <div className="p-3 bg-primary-foreground/10 rounded-lg">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm opacity-75">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/50 to-transparent" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-foreground/5 rounded-full" />
        <div className="absolute top-20 -right-10 w-40 h-40 bg-primary-foreground/5 rounded-full" />
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-6 sm:mb-8 justify-center">
            <img 
              src={currentLogo} 
              alt={branding.appName} 
              className="h-8 w-auto object-contain"
            />
            <span className="text-xl sm:text-2xl font-bold">{branding.appName}</span>
          </div>

          <Card className="border-0 shadow-medium">
            <CardHeader className="space-y-1 pb-4 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl font-bold">Bem-vindo</CardTitle>
              <CardDescription className="text-sm">
                {branding.signupEnabled 
                  ? 'Entre na sua conta ou crie uma nova para começar'
                  : 'Entre na sua conta para continuar'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {branding.signupEnabled ? (
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                    <TabsTrigger value="login" className="text-sm">Entrar</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm">Cadastrar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          disabled={isLoading}
                        />
                        <AnimatePresence>
                          {emailSuggestion && (
                            <EmailSuggestion
                              suggestion={emailSuggestion}
                              onAccept={acceptSuggestion}
                              onDismiss={dismissSuggestion}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Entrar
                      </Button>
                      <div className="text-center">
                        <Link 
                          to="/reset-password" 
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          Esqueci minha senha
                        </Link>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-fullName">Nome completo</Label>
                        <Input
                          id="signup-fullName"
                          type="text"
                          placeholder="Seu nome"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          disabled={isLoading}
                        />
                        <AnimatePresence>
                          {emailSuggestion && (
                            <EmailSuggestion
                              suggestion={emailSuggestion}
                              onAccept={acceptSuggestion}
                              onDismiss={dismissSuggestion}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Senha</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Criar conta
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      disabled={isLoading}
                    />
                    <AnimatePresence>
                      {emailSuggestion && (
                        <EmailSuggestion
                          suggestion={emailSuggestion}
                          onAccept={acceptSuggestion}
                          onDismiss={dismissSuggestion}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Entrar
                  </Button>
                  <div className="text-center">
                    <Link 
                      to="/reset-password" 
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
