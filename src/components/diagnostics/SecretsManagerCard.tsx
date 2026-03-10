import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings2, Plus, Save, Trash2, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';

interface AppSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

const KNOWN_SECRETS = [
  { key: 'EXTERNAL_PG_HOST', label: 'PostgreSQL Host', sensitive: false },
  { key: 'EXTERNAL_PG_PORT', label: 'PostgreSQL Porta', sensitive: false },
  { key: 'EXTERNAL_PG_DATABASE', label: 'PostgreSQL Database', sensitive: false },
  { key: 'EXTERNAL_PG_USER', label: 'PostgreSQL Usuário', sensitive: false },
  { key: 'EXTERNAL_PG_PASSWORD', label: 'PostgreSQL Senha', sensitive: true },
  { key: 'RESEND_API_KEY', label: 'Resend API Key', sensitive: true },
  { key: 'WEBHOOK_CLIENT_ID', label: 'Webhook Client ID', sensitive: false },
  { key: 'WEBHOOK_USER_ID', label: 'Webhook User ID', sensitive: false },
];

export function SecretsManagerCard() {
  const { isMaster } = useUserRole();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('key');

    if (error) {
      toast.error('Erro ao carregar configurações');
      console.error(error);
    } else {
      setSettings(data || []);
      const vals: Record<string, string> = {};
      (data || []).forEach(s => { vals[s.key] = s.value; });
      setEditValues(vals);
    }
    setLoading(false);
  };

  const saveSetting = async (key: string) => {
    setSaving(key);
    const existing = settings.find(s => s.key === key);
    const value = editValues[key] || '';

    if (existing) {
      const { error } = await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString(), updated_by: (await supabase.auth.getUser()).data.user?.id })
        .eq('id', existing.id);

      if (error) {
        toast.error(`Erro ao salvar ${key}`);
      } else {
        toast.success(`${key} atualizado`);
        await fetchSettings();
      }
    } else {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('app_settings')
        .insert({ key, value, updated_by: userId });

      if (error) {
        toast.error(`Erro ao criar ${key}`);
      } else {
        toast.success(`${key} criado`);
        await fetchSettings();
      }
    }
    setSaving(null);
  };

  const deleteSetting = async (id: string, key: string) => {
    const { error } = await supabase
      .from('app_settings')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(`Erro ao excluir ${key}`);
    } else {
      toast.success(`${key} removido`);
      const newEditValues = { ...editValues };
      delete newEditValues[key];
      setEditValues(newEditValues);
      await fetchSettings();
    }
  };

  const addNewSetting = async () => {
    if (!newKey.trim()) {
      toast.error('Informe a chave');
      return;
    }
    setAddingNew(true);
    editValues[newKey.trim()] = newValue;
    await saveSetting(newKey.trim());
    setNewKey('');
    setNewValue('');
    setAddingNew(false);
  };

  const toggleVisibility = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSensitive = (key: string) => {
    const known = KNOWN_SECRETS.find(k => k.key === key);
    return known?.sensitive ?? (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('api_key'));
  };

  const getLabel = (key: string) => {
    return KNOWN_SECRETS.find(k => k.key === key)?.label || key;
  };

  // Merge known secrets with existing settings
  const allKeys = new Set([
    ...KNOWN_SECRETS.map(k => k.key),
    ...settings.map(s => s.key),
  ]);

  const sortedKeys = Array.from(allKeys).sort();

  if (!isMaster) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Gerenciamento de Configurações
        </CardTitle>
        <CardDescription>
          Configurações armazenadas no banco de dados, acessíveis pelas funções de backend.
          <br />
          <span className="text-xs flex items-center gap-1 mt-1">
            <ShieldCheck className="h-3 w-3" />
            Apenas usuários master podem editar
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Chave</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-[60px]">Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKeys.map(key => {
                  const existing = settings.find(s => s.key === key);
                  const sensitive = isSensitive(key);
                  const visible = visibleKeys.has(key);
                  const hasChanged = existing ? editValues[key] !== existing.value : !!editValues[key];

                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs">{key}</span>
                          <div className="text-xs text-muted-foreground">{getLabel(key)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type={sensitive && !visible ? 'password' : 'text'}
                            value={editValues[key] || ''}
                            onChange={(e) => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={existing ? '••••••' : 'Não configurado'}
                            className="font-mono text-xs h-8"
                          />
                          {sensitive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => toggleVisibility(key)}
                            >
                              {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {existing ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Vazio
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => saveSetting(key)}
                            disabled={saving === key || !hasChanged}
                          >
                            {saving === key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </Button>
                          {existing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteSetting(existing.id, key)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Add new setting */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Adicionar nova configuração</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="CHAVE"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  className="font-mono text-xs h-8 w-[200px]"
                />
                <Input
                  placeholder="Valor"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="font-mono text-xs h-8 flex-1"
                />
                <Button
                  size="sm"
                  onClick={addNewSetting}
                  disabled={addingNew || !newKey.trim()}
                  className="h-8"
                >
                  {addingNew ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Adicionar
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
