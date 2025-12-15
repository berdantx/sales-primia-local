import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, Trash2, CheckCircle, XCircle, AlertCircle, Link } from 'lucide-react';
import { useLLMIntegrations, LLM_PROVIDERS, LLMProvider } from '@/hooks/useLLMIntegrations';
import { motion } from 'framer-motion';

interface ProviderCardProps {
  provider: typeof LLM_PROVIDERS[number];
}

function ProviderCard({ provider }: ProviderCardProps) {
  const { 
    getIntegration, 
    saveIntegration, 
    deleteIntegration, 
    toggleActive, 
    testConnection,
    maskApiKey 
  } = useLLMIntegrations();
  
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  const integration = getIntegration(provider.id);
  const isConfigured = !!integration;
  const isSaving = saveIntegration.isPending;
  const isDeleting = deleteIntegration.isPending;
  const isTesting = testConnection.isPending;

  const handleSave = () => {
    if (!apiKey.trim()) return;
    saveIntegration.mutate({ provider: provider.id, apiKey: apiKey.trim() });
    setApiKey('');
  };

  const handleDelete = () => {
    deleteIntegration.mutate(provider.id);
  };

  const handleTest = () => {
    testConnection.mutate(provider.id);
  };

  const handleToggle = (checked: boolean) => {
    toggleActive.mutate({ provider: provider.id, isActive: checked });
  };

  const getStatusBadge = () => {
    if (!isConfigured) {
      return <Badge variant="outline" className="text-muted-foreground">Não configurado</Badge>;
    }
    
    switch (integration?.test_status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Válido</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" /> Inválido</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Configurado</Badge>;
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{provider.icon}</span>
          <span className="font-medium">{provider.name}</span>
        </div>
        {getStatusBadge()}
      </div>

      {isConfigured ? (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded px-3 py-2 font-mono text-sm text-muted-foreground">
              {showKey ? integration.api_key : maskApiKey(integration.api_key)}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Testar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`active-${provider.id}`} className="text-sm text-muted-foreground">
                Ativo
              </Label>
              <Switch
                id={`active-${provider.id}`}
                checked={integration.is_active}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="Cole sua API key aqui..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono text-sm"
          />
          <Button 
            onClick={handleSave}
            disabled={!apiKey.trim() || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function LLMIntegrationsCard() {
  const { isLoading } = useLLMIntegrations();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Integrações com LLMs
          </CardTitle>
          <CardDescription>
            Configure suas API keys para usar recursos de inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            LLM_PROVIDERS.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
