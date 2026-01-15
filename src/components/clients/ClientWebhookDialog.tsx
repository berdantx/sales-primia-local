import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Check, Copy, Webhook, Play, Loader2, ChevronDown, Code } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

type TestFormat = 'active_campaign' | 'hotmart' | 'eduzz';

interface ClientWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

interface UTMParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function ClientWebhookDialog({ open, onOpenChange, client }: ClientWebhookDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testFormat, setTestFormat] = useState<TestFormat>('active_campaign');
  const [showPreview, setShowPreview] = useState(false);
  const [utmParams, setUtmParams] = useState<UTMParams>({
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: 'teste-campanha',
    utm_content: 'banner-principal',
    utm_term: 'curso-online',
  });

  if (!client) return null;

  const webhookUrl = `${SUPABASE_URL}/functions/v1/leads-webhook/${client.slug}`;

  // Generate payload based on format
  const getPayload = useMemo(() => {
    const timestamp = Date.now();
    const email = `teste-${timestamp}@exemplo.com`;

    if (testFormat === 'active_campaign') {
      const data = new URLSearchParams();
      data.append('contact[email]', email);
      data.append('contact[first_name]', 'Lead');
      data.append('contact[last_name]', 'de Teste');
      data.append('contact[phone]', '+5511999999999');
      data.append('contact[tags]', '[TESTE][WEBHOOK]');
      data.append('source', 'active_campaign');
      // Add UTMs as contact fields (Active Campaign format)
      if (utmParams.utm_source) data.append('contact[fields][utm_source]', utmParams.utm_source);
      if (utmParams.utm_medium) data.append('contact[fields][utm_medium]', utmParams.utm_medium);
      if (utmParams.utm_campaign) data.append('contact[fields][utm_campaign]', utmParams.utm_campaign);
      if (utmParams.utm_content) data.append('contact[fields][utm_content]', utmParams.utm_content);
      if (utmParams.utm_term) data.append('contact[fields][utm_term]', utmParams.utm_term);
      return data;
    } else if (testFormat === 'hotmart') {
      return {
        event: 'PURCHASE_COMPLETE',
        data: {
          buyer: {
            email: email,
            name: 'Lead de Teste Hotmart',
            phone: '+5511999999999',
          },
          purchase: {
            transaction: `TEST-${timestamp}`,
            order_date: new Date().toISOString(),
            tracking: {
              source_sck: utmParams.utm_source || undefined,
              utm_source: utmParams.utm_source || undefined,
              utm_medium: utmParams.utm_medium || undefined,
              utm_campaign: utmParams.utm_campaign || undefined,
              utm_content: utmParams.utm_content || undefined,
              utm_term: utmParams.utm_term || undefined,
            },
          },
          product: {
            name: 'Produto Teste Hotmart',
          },
        },
        source: 'hotmart',
      };
    } else {
      return {
        event_type: 'purchase',
        data: {
          client: {
            email: email,
            name: 'Lead de Teste Eduzz',
            phone: '+5511999999999',
          },
          sale: {
            sale_id: `EDUZZ-TEST-${timestamp}`,
            date_create: new Date().toISOString(),
            tracker: utmParams.utm_source || undefined,
            utm_source: utmParams.utm_source || undefined,
            utm_medium: utmParams.utm_medium || undefined,
            utm_campaign: utmParams.utm_campaign || undefined,
            utm_content: utmParams.utm_content || undefined,
            utm_term: utmParams.utm_term || undefined,
          },
          product: {
            name: 'Produto Teste Eduzz',
          },
        },
        source: 'eduzz',
      };
    }
  }, [testFormat, utmParams]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestWebhook = async () => {
    setIsTesting(true);
    try {
      let response: Response;

      if (testFormat === 'active_campaign') {
        const payload = getPayload as URLSearchParams;
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: payload.toString(),
        });
      } else {
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(getPayload),
        });
      }

      if (response.ok) {
        toast.success(`Lead de teste (${testFormat.toUpperCase()}) enviado com sucesso! Verifique a página de Leads.`);
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

  const formatPayloadPreview = () => {
    if (testFormat === 'active_campaign') {
      const params = getPayload as URLSearchParams;
      // Convert to readable format
      const obj: Record<string, string> = {};
      params.forEach((value, key) => {
        obj[key] = value;
      });
      return JSON.stringify(obj, null, 2);
    }
    return JSON.stringify(getPayload, null, 2);
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
                Selecione o formato e configure os UTM parameters para o teste:
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-format">Formato do teste</Label>
                  <Select value={testFormat} onValueChange={(v) => setTestFormat(v as TestFormat)}>
                    <SelectTrigger id="test-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active_campaign">
                        <div className="flex items-center gap-2">
                          <span>Active Campaign</span>
                          <Badge variant="secondary" className="text-xs">Form Data</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="hotmart">
                        <div className="flex items-center gap-2">
                          <span>Hotmart</span>
                          <Badge variant="outline" className="text-xs">JSON</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="eduzz">
                        <div className="flex items-center gap-2">
                          <span>Eduzz</span>
                          <Badge variant="outline" className="text-xs">JSON</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* UTM Parameters */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        UTM Parameters
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="utm_source" className="text-xs">utm_source</Label>
                        <Input
                          id="utm_source"
                          value={utmParams.utm_source}
                          onChange={(e) => setUtmParams(p => ({ ...p, utm_source: e.target.value }))}
                          placeholder="facebook"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="utm_medium" className="text-xs">utm_medium</Label>
                        <Input
                          id="utm_medium"
                          value={utmParams.utm_medium}
                          onChange={(e) => setUtmParams(p => ({ ...p, utm_medium: e.target.value }))}
                          placeholder="cpc"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="utm_campaign" className="text-xs">utm_campaign</Label>
                        <Input
                          id="utm_campaign"
                          value={utmParams.utm_campaign}
                          onChange={(e) => setUtmParams(p => ({ ...p, utm_campaign: e.target.value }))}
                          placeholder="campanha-teste"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="utm_content" className="text-xs">utm_content</Label>
                        <Input
                          id="utm_content"
                          value={utmParams.utm_content}
                          onChange={(e) => setUtmParams(p => ({ ...p, utm_content: e.target.value }))}
                          placeholder="banner"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="utm_term" className="text-xs">utm_term</Label>
                        <Input
                          id="utm_term"
                          value={utmParams.utm_term}
                          onChange={(e) => setUtmParams(p => ({ ...p, utm_term: e.target.value }))}
                          placeholder="palavra-chave"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Payload Preview */}
                <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Preview do Payload
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {testFormat === 'active_campaign' ? 'Form Data' : 'JSON'}
                        </Badge>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="relative">
                      <ScrollArea className="h-48 w-full rounded-md border bg-muted/50">
                        <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                          {formatPayloadPreview()}
                        </pre>
                      </ScrollArea>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => copyToClipboard(formatPayloadPreview(), 'payload')}
                      >
                        {copied === 'payload' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

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
                      Testar Webhook ({testFormat === 'active_campaign' ? 'Active Campaign' : testFormat === 'hotmart' ? 'Hotmart' : 'Eduzz'})
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Após o teste:</strong> Verifique a página de <strong>Leads</strong> para confirmar 
                  o recebimento.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
