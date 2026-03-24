import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Bot, Cpu, SlidersHorizontal, FileText, Shield, Trash2, RotateCcw, Save, Loader2 } from 'lucide-react';
import { useChatSettings, DEFAULT_CHAT_SETTINGS, MODEL_OPTIONS, ChatSettings } from '@/hooks/useChatSettings';

export function ChatSettingsCard() {
  const { settings, isLoading, updateSettings, isUpdating, clearAllConversations, isClearingHistory } = useChatSettings();
  const [local, setLocal] = useState<ChatSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocal(settings);
    setHasChanges(false);
  }, [settings]);

  const update = (partial: Partial<ChatSettings>) => {
    setLocal((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(local);
    setHasChanges(false);
  };

  const handleResetPrompt = () => {
    update({ systemPrompt: DEFAULT_CHAT_SETTINGS.systemPrompt });
  };

  const toggleFinancialRole = (role: string, checked: boolean) => {
    const current = [...local.financialRoles];
    if (checked && !current.includes(role)) {
      current.push(role);
    } else if (!checked) {
      const idx = current.indexOf(role);
      if (idx >= 0) current.splice(idx, 1);
    }
    update({ financialRoles: current });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modelo por Provedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Modelo por Provedor
          </CardTitle>
          <CardDescription>Escolha qual modelo será usado para cada provedor de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OpenAI</Label>
              <Select value={local.modelOpenai} onValueChange={(v) => update({ modelOpenai: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.openai.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Google Gemini</Label>
              <Select value={local.modelGemini} onValueChange={(v) => update({ modelGemini: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.gemini.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grok (xAI)</Label>
              <Select value={local.modelGrok} onValueChange={(v) => update({ modelGrok: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.grok.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>DeepSeek</Label>
              <Select value={local.modelDeepseek} onValueChange={(v) => update({ modelDeepseek: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.deepseek.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comportamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Comportamento
          </CardTitle>
          <CardDescription>Controle a criatividade e o tamanho das respostas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperatura</Label>
              <span className="text-sm font-mono text-muted-foreground">{local.temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[local.temperature]}
              onValueChange={([v]) => update({ temperature: v })}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              0 = mais preciso e determinístico, 1 = mais criativo e variado
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Máximo de Tokens</Label>
            <Input
              type="number"
              min={500}
              max={8000}
              step={100}
              value={local.maxTokens}
              onChange={(e) => update({ maxTokens: parseInt(e.target.value, 10) || 2000 })}
            />
            <p className="text-xs text-muted-foreground">
              Controla o tamanho máximo da resposta (500 a 8000)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prompt do Sistema
          </CardTitle>
          <CardDescription>
            Instruções que definem o comportamento do assistente. Contexto do usuário (role, cliente, data) é adicionado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={local.systemPrompt}
            onChange={(e) => update({ systemPrompt: e.target.value })}
            rows={8}
            className="font-mono text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleResetPrompt} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
        </CardContent>
      </Card>

      {/* Acesso Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Acesso a Dados Financeiros
          </CardTitle>
          <CardDescription>
            Defina quais níveis de usuário podem consultar dados financeiros (receita, faturamento, comissões) pelo assistente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { role: 'master', label: 'Master', desc: 'Acesso total à plataforma' },
            { role: 'admin', label: 'Admin', desc: 'Administrador do cliente' },
            { role: 'user', label: 'Usuário', desc: 'Usuário comum do cliente' },
          ].map(({ role, label, desc }) => (
            <div key={role} className="flex items-start gap-3">
              <Checkbox
                id={`financial-${role}`}
                checked={local.financialRoles.includes(role)}
                onCheckedChange={(checked) => toggleFinancialRole(role, !!checked)}
                disabled={role === 'master'}
              />
              <div className="space-y-0.5">
                <Label htmlFor={`financial-${role}`} className="cursor-pointer">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Histórico de Conversas
          </CardTitle>
          <CardDescription>Gerencie o histórico de conversas do assistente</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isClearingHistory}>
                {isClearingHistory ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Limpar todas as conversas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá apagar todas as suas conversas com o assistente. Isso não pode ser desfeito.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearAllConversations()}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Save button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={isUpdating} className="gap-2 shadow-lg">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar configurações
          </Button>
        </div>
      )}
    </div>
  );
}
