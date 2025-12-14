import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DropZone } from '@/components/upload/DropZone';
import { ImportPreview } from '@/components/upload/ImportPreview';
import { ImportProgress } from '@/components/upload/ImportProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { parseFile, HotmartTransaction, ParseError } from '@/lib/parsers/hotmartParser';
import { ArrowLeft, ArrowRight, Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

type UploadStep = 'upload' | 'preview' | 'importing' | 'complete';

export default function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<HotmartTransaction[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importId, setImportId] = useState<string | null>(null);

  const handleFileAccepted = async (acceptedFile: File) => {
    setFile(acceptedFile);
    
    try {
      const result = await parseFile(acceptedFile);
      setTransactions(result.transactions);
      setErrors(result.errors);
      setDuplicates(result.duplicates);
      setTotalRows(result.totalRows);
      setStep('preview');
    } catch (error) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    setFile(null);
    setTransactions([]);
    setErrors([]);
    setDuplicates([]);
    setTotalRows(0);
    setStep('upload');
  };

  const handleImport = async () => {
    if (!user || transactions.length === 0) return;

    setStep('importing');
    setImportProgress({ current: 0, total: transactions.length });

    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('imports')
        .insert({
          user_id: user.id,
          file_name: file?.name || 'unknown',
          file_size: file?.size || 0,
          template_type: 'hotmart',
          status: 'processing',
          total_rows: totalRows,
        })
        .select()
        .single();

      if (importError) throw importError;
      setImportId(importRecord.id);

      // Import transactions in batches
      const batchSize = 50;
      let importedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        const transactionRecords = batch.map(t => ({
          user_id: user.id,
          import_id: importRecord.id,
          transaction_code: t.transaction_code,
          product: t.product,
          currency: t.currency,
          country: t.country,
          gross_value_with_taxes: t.gross_value_with_taxes,
          sck_code: t.sck_code,
          payment_method: t.payment_method,
          total_installments: t.total_installments,
          billing_type: t.billing_type,
          computed_value: t.computed_value,
          buyer_name: t.buyer_name,
          buyer_email: t.buyer_email,
          purchase_date: t.purchase_date?.toISOString() || null,
        }));

        const { error: insertError } = await supabase
          .from('transactions')
          .upsert(transactionRecords, { 
            onConflict: 'user_id,transaction_code',
            ignoreDuplicates: true 
          });

        if (insertError) {
          console.error('Batch insert error:', insertError);
          errorCount += batch.length;
        } else {
          importedCount += batch.length;
        }

        setImportProgress({ current: Math.min(i + batchSize, transactions.length), total: transactions.length });
      }

      // Log errors to import_errors table
      if (errors.length > 0) {
        const errorRecords = errors.slice(0, 100).map(e => ({
          import_id: importRecord.id,
          row_number: e.row,
          error_type: e.type,
          error_message: e.message,
          raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
        }));

        await supabase.from('import_errors').insert(errorRecords);
        errorCount += errors.length;
      }

      // Update import record
      await supabase
        .from('imports')
        .update({
          status: 'completed',
          imported_rows: importedCount,
          duplicate_rows: duplicates.length,
          error_rows: errorCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importRecord.id);

      setStep('complete');
      toast({
        title: 'Importação concluída!',
        description: `${importedCount} transações importadas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setStep('preview');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Importar Vendas</h1>
            <p className="text-muted-foreground">
              Faça upload da sua planilha de vendas Hotmart
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Template: Vendas Hotmart
          </Badge>
        </motion.div>

        {/* Steps */}
        <div className="flex items-center gap-4">
          {[
            { key: 'upload', label: '1. Upload' },
            { key: 'preview', label: '2. Preview' },
            { key: 'importing', label: '3. Importar' },
          ].map((s, index) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s.key || ['preview', 'importing', 'complete'].indexOf(step) > ['upload', 'preview', 'importing'].indexOf(s.key) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}>
                {index + 1}
              </div>
              <span className={step === s.key ? 'font-medium' : 'text-muted-foreground'}>
                {s.label}
              </span>
              {index < 2 && <div className="w-12 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'upload' && 'Selecione o arquivo'}
              {step === 'preview' && 'Revise os dados'}
              {step === 'importing' && 'Importando...'}
              {step === 'complete' && 'Importação concluída!'}
            </CardTitle>
            <CardDescription>
              {step === 'upload' && 'Arraste sua planilha CSV ou XLSX para a área abaixo'}
              {step === 'preview' && 'Confira as transações antes de confirmar a importação'}
              {step === 'importing' && 'Aguarde enquanto processamos os dados'}
              {step === 'complete' && 'Suas transações foram importadas com sucesso'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'upload' && (
              <DropZone onFileAccepted={handleFileAccepted} />
            )}

            {step === 'preview' && (
              <div className="space-y-6">
                <ImportPreview
                  transactions={transactions}
                  errors={errors}
                  duplicates={duplicates}
                  totalRows={totalRows}
                />
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleClear}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={transactions.length === 0}
                  >
                    Confirmar Importação
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 'importing' && (
              <ImportProgress
                current={importProgress.current}
                total={importProgress.total}
                status="importing"
              />
            )}

            {step === 'complete' && (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="inline-flex p-4 bg-success/10 rounded-full mb-6"
                >
                  <CheckCircle2 className="h-16 w-16 text-success" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">
                  {transactions.length} transações importadas!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Você pode ver os dados no Dashboard ou na página de Transações.
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => navigate('/transactions')}>
                    Ver Transações
                  </Button>
                  <Button onClick={() => navigate('/')}>
                    Ir para Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
