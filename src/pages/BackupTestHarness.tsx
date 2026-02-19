import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FlaskConical,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileJson,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ValidationResult {
  table: string;
  recordCount: number;
  hasValidIds: boolean;
  hasRequiredFields: boolean;
  sampleErrors: string[];
  status: 'pass' | 'warn' | 'fail';
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  transactions: ['id', 'transaction_code', 'user_id', 'computed_value'],
  eduzz_transactions: ['id', 'sale_id', 'user_id', 'sale_value'],
  tmb_transactions: ['id', 'order_id', 'user_id', 'ticket_value'],
  clients: ['id', 'name', 'slug'],
  leads: ['id'],
  profiles: ['id', 'user_id'],
  goals: ['id', 'name', 'user_id'],
  user_roles: ['id', 'user_id', 'role'],
};

export default function BackupTestHarness() {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [backupInfo, setBackupInfo] = useState<any>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.json')) {
      toast.error('Selecione um arquivo JSON');
      return;
    }
    setFile(f);
    setResults([]);
    setBackupInfo(null);
  };

  const validateBackup = async () => {
    if (!file) return;
    setIsValidating(true);
    setResults([]);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.data || typeof parsed.data !== 'object') {
        toast.error('Estrutura de backup inválida: campo "data" ausente');
        setIsValidating(false);
        return;
      }

      setBackupInfo(parsed.backup_info || null);

      const validationResults: ValidationResult[] = [];

      for (const [tableName, records] of Object.entries(parsed.data)) {
        const arr = records as any[];
        const errors: string[] = [];
        const required = REQUIRED_FIELDS[tableName] || ['id'];

        // Check if it's an array
        if (!Array.isArray(arr)) {
          validationResults.push({
            table: tableName,
            recordCount: 0,
            hasValidIds: false,
            hasRequiredFields: false,
            sampleErrors: ['Dados não são um array'],
            status: 'fail',
          });
          continue;
        }

        // Check IDs
        const hasIds = arr.length === 0 || arr.every(r => r.id);
        if (!hasIds) {
          const missing = arr.filter(r => !r.id).length;
          errors.push(`${missing} registros sem ID`);
        }

        // Check required fields
        let missingFields = false;
        if (arr.length > 0) {
          const sample = arr[0];
          const missing = required.filter(f => !(f in sample));
          if (missing.length > 0) {
            missingFields = true;
            errors.push(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
          }
        }

        // Check for duplicate IDs
        const ids = arr.map(r => r.id).filter(Boolean);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size < ids.length) {
          errors.push(`${ids.length - uniqueIds.size} IDs duplicados`);
        }

        // Check for null required values in sample
        if (arr.length > 0) {
          const sampleSize = Math.min(10, arr.length);
          for (let i = 0; i < sampleSize; i++) {
            for (const field of required) {
              if (arr[i][field] === null || arr[i][field] === undefined) {
                errors.push(`Registro ${i}: campo "${field}" é null`);
                break;
              }
            }
          }
        }

        validationResults.push({
          table: tableName,
          recordCount: arr.length,
          hasValidIds: hasIds,
          hasRequiredFields: !missingFields,
          sampleErrors: errors.slice(0, 5),
          status: errors.length === 0 ? 'pass' : missingFields || !hasIds ? 'fail' : 'warn',
        });
      }

      setResults(validationResults);
      const failCount = validationResults.filter(r => r.status === 'fail').length;
      if (failCount > 0) {
        toast.warning(`${failCount} tabela(s) com problemas críticos`);
      } else {
        toast.success('Backup validado com sucesso!');
      }
    } catch (err) {
      toast.error('Erro ao processar arquivo: JSON inválido');
    } finally {
      setIsValidating(false);
    }
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-8 w-8" />
            Test Harness de Backup
          </h1>
          <p className="text-muted-foreground">Valide a integridade dos arquivos de backup antes de restaurar</p>
        </motion.div>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Arquivo</CardTitle>
            <CardDescription>Escolha um arquivo .json de backup para validar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="test-file"
              />
              <label htmlFor="test-file" className="cursor-pointer flex flex-col items-center gap-2">
                <FileJson className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : 'Clique para selecionar arquivo de backup (.json)'}
                </span>
              </label>
            </div>

            {file && (
              <Button onClick={validateBackup} disabled={isValidating} className="w-full">
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Executar Validação
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Backup Info */}
        {backupInfo && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informações do Backup</AlertTitle>
            <AlertDescription className="mt-2 text-sm space-y-1">
              <p><strong>Data:</strong> {format(new Date(backupInfo.created_at), 'dd/MM/yyyy HH:mm')}</p>
              <p><strong>Criado por:</strong> {backupInfo.created_by}</p>
              <p><strong>Total registros:</strong> {backupInfo.total_records?.toLocaleString('pt-BR')}</p>
              <p><strong>Versão:</strong> {backupInfo.version}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{passCount}</p>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{warnCount}</p>
                <p className="text-sm text-muted-foreground">Avisos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{failCount}</p>
                <p className="text-sm text-muted-foreground">Falhas</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados da Validação</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>IDs Válidos</TableHead>
                    <TableHead>Campos OK</TableHead>
                    <TableHead>Problemas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.table}>
                      <TableCell className="font-medium">{r.table}</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'pass' ? 'default' :
                          r.status === 'warn' ? 'secondary' : 'destructive'
                        }>
                          {r.status === 'pass' ? '✅ OK' : r.status === 'warn' ? '⚠️ Aviso' : '❌ Falha'}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.recordCount.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{r.hasValidIds ? '✅' : '❌'}</TableCell>
                      <TableCell>{r.hasRequiredFields ? '✅' : '❌'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                        {r.sampleErrors.length > 0 ? r.sampleErrors.join('; ') : '-'}
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
