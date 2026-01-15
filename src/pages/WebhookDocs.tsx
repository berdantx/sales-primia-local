import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Webhook, 
  Link2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Code,
  Users,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function WebhookDocs() {
  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7" />
            Documentação de Webhooks
          </h1>
          <p className="text-muted-foreground">
            Guia completo para configurar webhooks e receber leads automaticamente
          </p>
        </motion.div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Visão Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Webhooks permitem que você receba dados de leads automaticamente de diferentes plataformas 
              como Active Campaign, Hotmart e Eduzz. Cada cliente possui sua própria URL de webhook única.
            </p>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Por Cliente</h4>
                  <p className="text-sm text-muted-foreground">Cada cliente tem sua URL única</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Zap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Automático</h4>
                  <p className="text-sm text-muted-foreground">Detecta a plataforma de origem</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Logs Completos</h4>
                  <p className="text-sm text-muted-foreground">Histórico de todas as requisições</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Estrutura da URL
            </CardTitle>
            <CardDescription>
              Como é formada a URL do webhook de cada cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <span className="text-muted-foreground">{SUPABASE_URL}/functions/v1/leads-webhook/</span>
              <span className="text-primary font-bold">{'{slug-do-cliente}'}</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Exemplos:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <code className="bg-muted px-2 py-1 rounded">.../leads-webhook/camila-vieira</code>
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <code className="bg-muted px-2 py-1 rounded">.../leads-webhook/empresa-xyz</code>
                </li>
              </ul>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Importante</AlertTitle>
              <AlertDescription>
                O slug do cliente é definido na criação do cliente e deve ser único. 
                Você pode ver a URL completa na página de <strong>Clientes</strong> clicando no ícone de webhook.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Platform Configurations */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração por Plataforma</CardTitle>
            <CardDescription>
              Instruções detalhadas para cada plataforma suportada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active_campaign" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active_campaign">Active Campaign</TabsTrigger>
                <TabsTrigger value="hotmart">Hotmart</TabsTrigger>
                <TabsTrigger value="eduzz">Eduzz</TabsTrigger>
              </TabsList>

              <TabsContent value="active_campaign" className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Automação</Badge>
                  <Badge variant="outline">Form Data</Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Passo a Passo</h4>
                    <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                      <li>Acesse sua conta do <strong>Active Campaign</strong></li>
                      <li>Navegue até <strong>Automations</strong> no menu lateral</li>
                      <li>Crie uma nova automação ou edite uma existente</li>
                      <li>Adicione a ação <strong>"Webhook"</strong></li>
                      <li>Cole a URL do webhook do cliente no campo de URL</li>
                      <li>Configure:
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Método: <strong>POST</strong></li>
                          <li>Data format: <strong>Form Data</strong></li>
                          <li>Marque <strong>"Send contact data"</strong></li>
                        </ul>
                      </li>
                      <li>Salve e ative a automação</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Campos Capturados</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between py-2 border-b">
                        <span>Email</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">contact[email]</code>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Nome</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">contact[first_name]</code>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Telefone</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">contact[phone]</code>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Tags</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">contact[tags]</code>
                      </div>
                      <div className="flex justify-between py-2">
                        <span>UTMs</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">contact[fields][utm_*]</code>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hotmart" className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Webhook Nativo</Badge>
                  <Badge variant="outline">JSON</Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Passo a Passo</h4>
                    <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                      <li>Acesse o <strong>Hotmart</strong> (área do produtor)</li>
                      <li>Vá em <strong>Ferramentas</strong> → <strong>Webhooks</strong></li>
                      <li>Clique em <strong>"Criar Webhook"</strong></li>
                      <li>Preencha os campos:
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li>Nome: identifique o webhook (ex: "Leads AnalyzeFlow")</li>
                          <li>URL: cole a URL do webhook do cliente</li>
                        </ul>
                      </li>
                      <li>Selecione os eventos:
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                          <li><strong>PURCHASE_COMPLETE</strong> - Compra aprovada</li>
                          <li><strong>PURCHASE_BILLET_PRINTED</strong> - Boleto gerado (opcional)</li>
                          <li><strong>SUBSCRIPTION_CANCELLATION</strong> - Cancelamento</li>
                        </ul>
                      </li>
                      <li>Ative e salve o webhook</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Dados Extraídos</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between py-2 border-b">
                        <span>Email do comprador</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">buyer.email</code>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Nome</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">buyer.name</code>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Telefone</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">buyer.phone</code>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>UTM Source</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">purchase.tracking.source</code>
                      </div>
                      <div className="flex justify-between py-2">
                        <span>SCK Code</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">purchase.origin.sck</code>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="eduzz" className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Postback</Badge>
                  <Badge variant="outline">JSON</Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Passo a Passo</h4>
                    <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                      <li>Acesse sua conta na <strong>Eduzz</strong></li>
                      <li>Vá em <strong>Minha Conta</strong> → <strong>Configurações</strong></li>
                      <li>Procure a seção de <strong>Integrações</strong> ou <strong>Webhooks</strong></li>
                      <li>Adicione uma nova URL de postback</li>
                      <li>Cole a URL do webhook do cliente</li>
                      <li>Configure os eventos de notificação</li>
                      <li>Salve as configurações</li>
                    </ol>
                  </div>
                  
                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nota sobre Eduzz</AlertTitle>
                    <AlertDescription>
                      A Eduzz pode ter diferentes interfaces dependendo se você é produtor ou afiliado. 
                      O webhook detecta automaticamente o formato dos dados enviados.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Solução de Problemas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="border-l-4 border-destructive pl-4 py-2">
                <h4 className="font-medium">Leads não estão chegando</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifique se a URL está correta e se o cliente está ativo. 
                  Confira os logs de webhook para ver se há erros.
                </p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <h4 className="font-medium">Erro 404 - Client not found</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  O slug do cliente na URL não foi encontrado. 
                  Verifique se o slug está correto e se o cliente existe.
                </p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <h4 className="font-medium">Erro 403 - Client is inactive</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  O cliente está desativado. Ative o cliente na página de Clientes para receber webhooks.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-medium">Campos não estão sendo capturados</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifique se os campos estão configurados corretamente na plataforma de origem. 
                  Confira o payload nos logs de webhook.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Referência da API
            </CardTitle>
            <CardDescription>
              Para integrações customizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Endpoint</h4>
              <code className="block bg-muted p-3 rounded text-sm">
                POST {SUPABASE_URL}/functions/v1/leads-webhook/{'{client-slug}'}
              </code>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Headers</h4>
              <code className="block bg-muted p-3 rounded text-sm">
                Content-Type: application/json
              </code>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Body (JSON)</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "email": "lead@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "phone": "+5511999999999",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "campanha-123",
  "tags": "[TAG1], [TAG2]"
}`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Resposta de Sucesso</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "message": "Lead processed successfully",
  "lead_id": "uuid-do-lead",
  "source": "n8n"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default WebhookDocs;