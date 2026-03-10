import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Globe,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const EDGE_FUNCTIONS = [
  'export-backup',
  'restore-backup',
  'hotmart-webhook',
  'eduzz-webhook',
  'tmb-webhook',
  'leads-webhook',
  'send-invitation',
  'get-dollar-rate',
  'log-access',
  'process-scheduled-webhooks',
  'pwa-manifest',
  'test-llm-connection',
  'delete-user',
];

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'cors-error' | 'error' | 'timeout';
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export default function CorsDiagnostics() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [customFunction, setCustomFunction] = useState('');
  const [pgResult, setPgResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    responseTime?: number;
    pgVersion?: string;
    error?: string;
  }>({ status: 'idle' });

  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const testFunction = async (name: string): Promise<TestResult> => {
    const url = `${projectUrl}/functions/v1/${name}`;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;

      // Any HTTP response means CORS passed (browser allowed the request)
      return {
        name,
        status: 'success',
        statusCode: res.status,
        responseTime,
      };
    } catch (err: any) {
      const responseTime = Date.now() - start;
      if (err.name === 'AbortError' || responseTime > 10000) {
        return { name, status: 'timeout', responseTime, error: 'Timeout (>10s)' };
      }
      // TypeError: Failed to fetch = browser blocked by CORS
      return {
        name,
        status: 'cors-error',
        responseTime,
        error: 'Bloqueado pelo browser (CORS)',
      };
    }
  };

  const runAllTests = async () => {
    setIsTesting(true);
    const functionsToTest = [...EDGE_FUNCTIONS];
    if (customFunction.trim()) {
      functionsToTest.push(customFunction.trim());
    }

    const initialResults: TestResult[] = functionsToTest.map(name => ({
      name,
      status: 'pending',
    }));
    setResults(initialResults);

    const finalResults: TestResult[] = [];
    for (const name of functionsToTest) {
      const result = await testFunction(name);
      finalResults.push(result);
      setResults([...finalResults, ...functionsToTest.slice(finalResults.length).map(n => ({ name: n, status: 'pending' as const }))]);
    }

    setResults(finalResults);
    setIsTesting(false);

    const errors = finalResults.filter(r => r.status !== 'success');
    if (errors.length === 0) {
      toast.success('Todas as funções passaram no teste!');
    } else {
      toast.warning(`${errors.length} função(ões) com problemas`);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status !== 'success' && r.status !== 'pending').length;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Diagnóstico CORS
          </h1>
          <p className="text-muted-foreground">
            Teste a conectividade e configuração CORS das funções de backend
          </p>
        </motion.div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Teste</CardTitle>
            <CardDescription>Adicione funções customizadas ou execute todos os testes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Função customizada (opcional)</Label>
                <Input
                  placeholder="nome-da-funcao"
                  value={customFunction}
                  onChange={(e) => setCustomFunction(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={runAllTests} disabled={isTesting}>
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Executar Testes ({EDGE_FUNCTIONS.length + (customFunction ? 1 : 0)})
                </Button>
              </div>
            </div>

            {results.length > 0 && (
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {successCount} OK
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  {errorCount} Erro(s)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead>CORS</TableHead>
                    <TableHead>HTTP Status</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-mono text-sm">{r.name}</TableCell>
                      <TableCell>
                        {r.status === 'pending' ? (
                          <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Testando</Badge>
                        ) : r.status === 'success' ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />OK
                          </Badge>
                        ) : r.status === 'cors-error' ? (
                          <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Bloqueado</Badge>
                        ) : (
                          <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Timeout</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{r.statusCode || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {r.responseTime ? `${r.responseTime}ms` : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                        {r.status === 'success' && r.statusCode
                          ? r.statusCode >= 400 ? 'CORS OK (erro esperado sem payload válido)' : 'CORS OK'
                          : r.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
