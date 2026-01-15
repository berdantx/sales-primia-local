import { useState } from 'react';
import { Client } from '@/hooks/useClients';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Copy, ExternalLink, Webhook, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClientWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function ClientWebhookDialog({ open, onOpenChange, client }: ClientWebhookDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!client) return null;

  const webhookUrl = `${SUPABASE_URL}/functions/v1/leads-webhook/${client.slug}`;

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestWebhook = async () => {
    setIsTesting(true);
    try {
      // Use URLSearchParams for x-www-form-urlencoded format (compatible with Active Campaign)
      const testData = new URLSearchParams();
      testData.append('contact[email]', `teste-${Date.now()}@exemplo.com`);
      testData.append('contact[first_name]', 'Lead');
      testData.append('contact[last_name]', 'de Teste');
      testData.append('contact[phone]', '+5511999999999');
      testData.append('contact[tags]', '[TESTE][WEBHOOK]');
      testData.append('source', 'active_campaign');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: testData.toString(),
      });

      if (response.ok) {
        toast.success('Lead de teste enviado com sucesso! Verifique a página de Leads.');
      } else {
        const errorText = await response.text();
        toast.error(`Erro ao enviar lead de teste: ${response.status}`);
        console.error('Webhook test error:', errorText);
      }
    } catch (error) {
      console.error('Webhook test connection error:', error);
      toast.error('Erro de conexão ao testar webhook');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Configuração de Webhook
          </DialogTitle>
          <DialogDescription>
            URLs de webhook para o cliente <strong>{client.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Webhook URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">URL do Webhook de Leads</CardTitle>
              <CardDescription>
                Use esta URL para receber leads do Active Campaign, Hotmart ou Eduzz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                >
                  {copied === 'webhook' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Platform Instructions */}
          <Tabs defaultValue="active_campaign">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active_campaign">Active Campaign</TabsTrigger>
              <TabsTrigger value="hotmart">Hotmart</TabsTrigger>
              <TabsTrigger value="eduzz">Eduzz</TabsTrigger>
            </TabsList>

            <TabsContent value="active_campaign" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Configuração no Active Campaign
                    <Badge variant="secondary">Recomendado</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                    <li>Acesse sua conta do Active Campaign</li>
                    <li>Vá em <strong>Automations</strong> → crie ou edite uma automação</li>
                    <li>Adicione a ação <strong>"Webhook"</strong> na automação</li>
                    <li>Cole a URL do webhook acima no campo de URL</li>
                    <li>Selecione o método <strong>POST</strong></li>
                    <li>Em "Data format", selecione <strong>Form Data</strong></li>
                    <li>Ative a opção <strong>"Send contact data"</strong></li>
                    <li>Salve a automação</li>
                  </ol>
                  
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Dica:</strong> Os campos personalizados (utm_source, utm_medium, etc.) 
                      serão capturados automaticamente se estiverem configurados como campos do contato.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hotmart" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuração no Hotmart</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                    <li>Acesse o <strong>Hotmart Club</strong> ou <strong>Hotmart</strong></li>
                    <li>Vá em <strong>Ferramentas</strong> → <strong>Webhooks</strong></li>
                    <li>Clique em <strong>"Adicionar Webhook"</strong></li>
                    <li>Cole a URL do webhook no campo de URL</li>
                    <li>Selecione os eventos desejados:
                      <ul className="list-disc list-inside ml-4 mt-2">
                        <li>PURCHASE_COMPLETE (compra aprovada)</li>
                        <li>PURCHASE_CANCELED (compra cancelada)</li>
                        <li>SUBSCRIPTION_CANCELLATION (assinatura cancelada)</li>
                      </ul>
                    </li>
                    <li>Ative o webhook e salve</li>
                  </ol>
                  
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Dica:</strong> O sistema detecta automaticamente o formato do Hotmart 
                      e extrai as informações do comprador e UTMs de rastreamento.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="eduzz" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configuração no Eduzz</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                    <li>Acesse sua conta na <strong>Eduzz</strong></li>
                    <li>Vá em <strong>Configurações</strong> → <strong>Integrações</strong></li>
                    <li>Procure por <strong>"Webhook"</strong> ou <strong>"Postback"</strong></li>
                    <li>Cole a URL do webhook no campo correspondente</li>
                    <li>Configure os eventos de notificação:
                      <ul className="list-disc list-inside ml-4 mt-2">
                        <li>Venda aprovada</li>
                        <li>Venda cancelada</li>
                        <li>Reembolso</li>
                      </ul>
                    </li>
                    <li>Salve as configurações</li>
                  </ol>
                  
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Dica:</strong> O Eduzz pode ter diferentes formatos de webhook 
                      dependendo do produto. O sistema tenta identificar automaticamente.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Test Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Testando o Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para enviar um lead de teste e verificar se o webhook está funcionando:
              </p>
              
              <Button 
                onClick={handleTestWebhook} 
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Testar Webhook
                  </>
                )}
              </Button>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Após o teste:</strong> Verifique a página de <strong>Leads</strong> para confirmar 
                  o recebimento. O lead terá a tag <code>[TESTE][WEBHOOK]</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}