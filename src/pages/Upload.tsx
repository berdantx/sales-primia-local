import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { DropZone } from '@/components/upload/DropZone';
import { ImportPreview } from '@/components/upload/ImportPreview';
import { TmbImportPreview } from '@/components/upload/TmbImportPreview';
import { EduzzImportPreview } from '@/components/upload/EduzzImportPreview';
import { ImportProgress } from '@/components/upload/ImportProgress';
import { PlatformSelector, UploadPlatform } from '@/components/upload/PlatformSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFilter } from '@/contexts/FilterContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { parseFile, HotmartTransaction, ParseError } from '@/lib/parsers/hotmartParser';
import { parseTmbFile, TmbTransaction, TmbParseError } from '@/lib/parsers/tmbParser';
import { parseEduzzFile, EduzzTransaction, EduzzParseError } from '@/lib/parsers/eduzzParser';
import { ArrowLeft, ArrowRight, FileSpreadsheet, Store, CheckCircle2, CreditCard } from 'lucide-react';
import { DataManagement } from '@/components/upload/DataManagement';

type UploadStep = 'platform' | 'upload' | 'preview' | 'importing' | 'complete';

export default function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { clientId, setClientId } = useFilter();
  const { isMaster } = useUserRole();

  const [step, setStep] = useState<UploadStep>('platform');
  const [platform, setPlatform] = useState<UploadPlatform>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // Hotmart state
  const [hotmartTransactions, setHotmartTransactions] = useState<HotmartTransaction[]>([]);
  const [hotmartErrors, setHotmartErrors] = useState<ParseError[]>([]);
  
  // TMB state
  const [tmbTransactions, setTmbTransactions] = useState<TmbTransaction[]>([]);
  const [tmbErrors, setTmbErrors] = useState<TmbParseError[]>([]);
  
  // Eduzz state
  const [eduzzTransactions, setEduzzTransactions] = useState<EduzzTransaction[]>([]);
  const [eduzzErrors, setEduzzErrors] = useState<EduzzParseError[]>([]);
  
  // Shared state
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importId, setImportId] = useState<string | null>(null);

  const handlePlatformSelect = (selectedPlatform: UploadPlatform) => {
    setPlatform(selectedPlatform);
    setStep('upload');
  };

  const handleFileAccepted = async (acceptedFile: File) => {
    setFile(acceptedFile);
    
    try {
      if (platform === 'hotmart') {
        const result = await parseFile(acceptedFile);
        setHotmartTransactions(result.transactions);
        setHotmartErrors(result.errors);
        setDuplicates(result.duplicates);
        setTotalRows(result.totalRows);
      } else if (platform === 'tmb') {
        const result = await parseTmbFile(acceptedFile);
        setTmbTransactions(result.transactions);
        setTmbErrors(result.errors);
        setDuplicates(result.duplicates);
        setTotalRows(result.totalRows);
      } else if (platform === 'eduzz') {
        const result = await parseEduzzFile(acceptedFile);
        setEduzzTransactions(result.transactions);
        setEduzzErrors(result.errors);
        setDuplicates(result.duplicates);
        setTotalRows(result.totalRows);
      }
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
    setHotmartTransactions([]);
    setHotmartErrors([]);
    setTmbTransactions([]);
    setTmbErrors([]);
    setEduzzTransactions([]);
    setEduzzErrors([]);
    setDuplicates([]);
    setTotalRows(0);
    setStep('upload');
  };

  const handleBackToPlatform = () => {
    handleClear();
    setPlatform(null);
    setStep('platform');
  };

  const handleImport = async () => {
    if (!user) return;

    const transactionCount = platform === 'hotmart' 
      ? hotmartTransactions.length 
      : platform === 'tmb'
      ? tmbTransactions.length
      : eduzzTransactions.length;
    
    if (transactionCount === 0) return;

    setStep('importing');
    setImportProgress({ current: 0, total: transactionCount });

    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('imports')
        .insert({
          user_id: user.id,
          file_name: file?.name || 'unknown',
          file_size: file?.size || 0,
          template_type: platform || 'hotmart',
          status: 'processing',
          total_rows: totalRows,
          client_id: clientId,
        })
        .select()
        .single();

      if (importError) throw importError;
      setImportId(importRecord.id);

      const batchSize = 50;
      let importedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      if (platform === 'hotmart') {
        // Import Hotmart transactions
        for (let i = 0; i < hotmartTransactions.length; i += batchSize) {
          const batch = hotmartTransactions.slice(i, i + batchSize);
          
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
            projected_value: t.projected_value,
            buyer_name: t.buyer_name,
            buyer_email: t.buyer_email,
            purchase_date: t.purchase_date?.toISOString() || null,
            source: 'hotmart',
            client_id: clientId,
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

          setImportProgress({ current: Math.min(i + batchSize, hotmartTransactions.length), total: hotmartTransactions.length });
        }

        // Log errors
        if (hotmartErrors.length > 0) {
          const errorRecords = hotmartErrors.slice(0, 100).map(e => ({
            import_id: importRecord.id,
            row_number: e.row,
            error_type: e.type,
            error_message: e.message,
            raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
          }));
          await supabase.from('import_errors').insert(errorRecords);
          errorCount += hotmartErrors.length;
        }
      } else if (platform === 'tmb') {
        // Import TMB transactions
        for (let i = 0; i < tmbTransactions.length; i += batchSize) {
          const batch = tmbTransactions.slice(i, i + batchSize);
          
          const transactionRecords = batch.map(t => ({
            user_id: user.id,
            import_id: importRecord.id,
            order_id: t.order_id,
            product: t.product,
            buyer_name: t.buyer_name,
            buyer_email: t.buyer_email,
            ticket_value: t.ticket_value,
            currency: 'BRL',
            effective_date: t.effective_date?.toISOString() || null,
            utm_source: t.utm_source || null,
            utm_medium: t.utm_medium || null,
            utm_campaign: t.utm_campaign || null,
            utm_content: t.utm_content || null,
            source: 'tmb',
            client_id: clientId,
          }));

          const { error: insertError } = await supabase
            .from('tmb_transactions')
            .upsert(transactionRecords, { 
              onConflict: 'user_id,order_id',
              ignoreDuplicates: true 
            });

          if (insertError) {
            console.error('Batch insert error:', insertError);
            errorCount += batch.length;
          } else {
            importedCount += batch.length;
          }

          setImportProgress({ current: Math.min(i + batchSize, tmbTransactions.length), total: tmbTransactions.length });
        }

        // Log errors
        if (tmbErrors.length > 0) {
          const errorRecords = tmbErrors.slice(0, 100).map(e => ({
            import_id: importRecord.id,
            row_number: e.row,
            error_type: e.type,
            error_message: e.message,
            raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
          }));
          await supabase.from('import_errors').insert(errorRecords);
          errorCount += tmbErrors.length;
        }
      } else if (platform === 'eduzz') {
        // Import Eduzz transactions
        for (let i = 0; i < eduzzTransactions.length; i += batchSize) {
          const batch = eduzzTransactions.slice(i, i + batchSize);
          
          const transactionRecords = batch.map(t => ({
            user_id: user.id,
            import_id: importRecord.id,
            sale_id: t.sale_id,
            invoice_code: t.invoice_code || null,
            product: t.product || null,
            product_id: t.product_id || null,
            buyer_name: t.buyer_name || null,
            buyer_email: t.buyer_email || null,
            buyer_phone: t.buyer_phone || null,
            sale_value: t.sale_value || 0,
            currency: 'BRL',
            sale_date: t.sale_date?.toISOString() || null,
            utm_source: t.utm_source || null,
            utm_medium: t.utm_medium || null,
            utm_campaign: t.utm_campaign || null,
            utm_content: t.utm_content || null,
            source: 'eduzz',
            client_id: clientId,
          }));

          const { error: insertError } = await supabase
            .from('eduzz_transactions')
            .upsert(transactionRecords, { 
              onConflict: 'user_id,sale_id',
              ignoreDuplicates: true 
            });

          if (insertError) {
            console.error('Batch insert error:', insertError);
            errorCount += batch.length;
          } else {
            importedCount += batch.length;
          }

          setImportProgress({ current: Math.min(i + batchSize, eduzzTransactions.length), total: eduzzTransactions.length });
        }

        // Log errors
        if (eduzzErrors.length > 0) {
          const errorRecords = eduzzErrors.slice(0, 100).map(e => ({
            import_id: importRecord.id,
            row_number: e.row,
            error_type: e.type,
            error_message: e.message,
            raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
          }));
          await supabase.from('import_errors').insert(errorRecords);
          errorCount += eduzzErrors.length;
        }
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

  const transactionCount = platform === 'hotmart' 
    ? hotmartTransactions.length 
    : platform === 'tmb'
    ? tmbTransactions.length
    : eduzzTransactions.length;

  const getPlatformIcon = () => {
    if (platform === 'hotmart') return <FileSpreadsheet className="h-4 w-4" />;
    if (platform === 'tmb') return <Store className="h-4 w-4" />;
    if (platform === 'eduzz') return <CreditCard className="h-4 w-4" />;
    return null;
  };

  const getPlatformLabel = () => {
    if (platform === 'hotmart') return 'Vendas Hotmart';
    if (platform === 'tmb') return 'Vendas TMB';
    if (platform === 'eduzz') return 'Vendas Eduzz';
    return '';
  };

  const getDropZoneHint = () => {
    if (platform === 'hotmart') return 'Arraste sua planilha CSV ou XLSX para a área abaixo';
    if (platform === 'tmb') return 'Arraste sua planilha CSV (delimitador ;) para a área abaixo';
    if (platform === 'eduzz') return 'Arraste sua planilha CSV ou XLSX da Eduzz para a área abaixo';
    return '';
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <ClientContextHeader 
            title="Importar Vendas"
            description={step === 'platform' 
              ? 'Selecione a plataforma de origem dos dados'
              : `Faça upload da sua planilha de vendas ${platform?.toUpperCase() || ''}`
            }
          />
          {platform && (
            <Badge variant="outline" className="gap-2">
              {getPlatformIcon()}
              Template: {getPlatformLabel()}
            </Badge>
          )}
        </motion.div>

        {/* Steps */}
        {step !== 'platform' && (
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
        )}

        {/* Data Management */}
        {step === 'platform' && <DataManagement />}

        {/* Content */}
        {step === 'platform' ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecione a plataforma</CardTitle>
              <CardDescription>
                Escolha a plataforma de origem para importar suas vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformSelector onSelect={handlePlatformSelect} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {step === 'upload' && 'Selecione o arquivo'}
                {step === 'preview' && 'Revise os dados'}
                {step === 'importing' && 'Importando...'}
                {step === 'complete' && 'Importação concluída!'}
              </CardTitle>
              <CardDescription>
                {step === 'upload' && getDropZoneHint()}
                {step === 'preview' && 'Confira as transações antes de confirmar a importação'}
                {step === 'importing' && 'Aguarde enquanto processamos os dados'}
                {step === 'complete' && 'Suas transações foram importadas com sucesso'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'upload' && (
                <div className="space-y-4">
                  <DropZone onFileAccepted={handleFileAccepted} />
                  <Button variant="ghost" onClick={handleBackToPlatform} className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar e escolher outra plataforma
                  </Button>
                </div>
              )}

              {step === 'preview' && platform === 'hotmart' && (
                <div className="space-y-6">
                  <ImportPreview
                    transactions={hotmartTransactions}
                    errors={hotmartErrors}
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
                      disabled={hotmartTransactions.length === 0}
                    >
                      Confirmar Importação
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 'preview' && platform === 'tmb' && (
                <div className="space-y-6">
                  <TmbImportPreview
                    transactions={tmbTransactions}
                    errors={tmbErrors}
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
                      disabled={tmbTransactions.length === 0}
                    >
                      Confirmar Importação
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 'preview' && platform === 'eduzz' && (
                <div className="space-y-6">
                  <EduzzImportPreview
                    transactions={eduzzTransactions}
                    errors={eduzzErrors}
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
                      disabled={eduzzTransactions.length === 0}
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
                    {transactionCount} transações importadas!
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
        )}
      </div>
    </MainLayout>
  );
}
