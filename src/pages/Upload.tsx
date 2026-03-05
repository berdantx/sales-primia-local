import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientContextHeader } from '@/components/layout/ClientContextHeader';
import { DropZone } from '@/components/upload/DropZone';
import { ImportPreview } from '@/components/upload/ImportPreview';
import { TmbImportPreview } from '@/components/upload/TmbImportPreview';
import { EduzzImportPreview } from '@/components/upload/EduzzImportPreview';
import { CispayImportPreview } from '@/components/upload/CispayImportPreview';
import { ImportProgress } from '@/components/upload/ImportProgress';
import { PlatformSelector, UploadPlatform } from '@/components/upload/PlatformSelector';
import { DuplicateReviewDialog, DuplicateMatch, DuplicateAction } from '@/components/upload/DuplicateReviewDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFilter } from '@/contexts/FilterContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useImportTransactions, DuplicateScanResult } from '@/hooks/useImportTransactions';
import { supabase } from '@/integrations/supabase/client';
import { parseFile, parseCSV, parseXLSX, parseHotmartData, autoDetectHotmartColumns, HotmartTransaction, ParseError } from '@/lib/parsers/hotmartParser';
import { parseTmbFile, parseTmbCSV, parseTmbData, autoDetectTmbColumns, TmbTransaction, TmbParseError } from '@/lib/parsers/tmbParser';
import { parseEduzzFile, parseEduzzCSV, parseEduzzXLSX, parseEduzzData, autoDetectEduzzColumns, EduzzTransaction, EduzzParseError } from '@/lib/parsers/eduzzParser';
import { parseCispayXLSX, parseCispayData, autoDetectCispayColumns, CispayTransaction, CispayParseError } from '@/lib/parsers/cispayParser';
import { ArrowLeft, ArrowRight, FileSpreadsheet, Store, CheckCircle2, CreditCard, GraduationCap, Loader2 } from 'lucide-react';
import { ActiveClientBlock } from '@/components/layout/ActiveClientBlock';
import { DataManagement } from '@/components/upload/DataManagement';
import { 
  ColumnMappingStep, ColumnMappingResult,
  HOTMART_FIELD_DEFINITIONS, TMB_FIELD_DEFINITIONS, EDUZZ_FIELD_DEFINITIONS, CISPAY_FIELD_DEFINITIONS 
} from '@/components/upload/ColumnMappingStep';

type UploadStep = 'platform' | 'upload' | 'mapping' | 'preview' | 'scanning' | 'importing' | 'complete';

export default function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { clientId } = useFilter();
  const { isMaster } = useUserRole();
  const {
    progress: importProgress,
    importHotmart, importTmb, importEduzz, importCispay,
    scanHotmartDuplicates, scanTmbDuplicates, scanEduzzDuplicates, scanCispayDuplicates,
  } = useImportTransactions();

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
  
  // CIS PAY state
  const [cispayTransactions, setCispayTransactions] = useState<CispayTransaction[]>([]);
  const [cispayErrors, setCispayErrors] = useState<CispayParseError[]>([]);
  
  // Shared state
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  // Duplicate review state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateScanResult, setDuplicateScanResult] = useState<DuplicateScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Column mapping state
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [autoDetectedMap, setAutoDetectedMap] = useState<Record<string, string | null>>({});

  const handlePlatformSelect = (selectedPlatform: UploadPlatform) => {
    setPlatform(selectedPlatform);
    setStep('upload');
  };

  const handleFileAccepted = async (acceptedFile: File) => {
    setFile(acceptedFile);
    
    try {
      // Parse file to get raw data and headers, then go to mapping step
      let data: Record<string, unknown>[];
      let headers: string[];
      
      if (platform === 'hotmart') {
        const ext = acceptedFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'csv') {
          const r = await parseCSV(acceptedFile);
          data = r.data; headers = r.headers;
        } else {
          const r = await parseXLSX(acceptedFile);
          data = r.data; headers = r.headers;
        }
        setAutoDetectedMap(autoDetectHotmartColumns(headers));
      } else if (platform === 'tmb') {
        const r = await parseTmbCSV(acceptedFile);
        data = r.data; headers = r.headers;
        setAutoDetectedMap(autoDetectTmbColumns(headers));
      } else if (platform === 'eduzz') {
        const ext = acceptedFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'csv') {
          const r = await parseEduzzCSV(acceptedFile);
          data = r.data; headers = r.headers;
        } else {
          const r = await parseEduzzXLSX(acceptedFile);
          data = r.data; headers = r.headers;
        }
        setAutoDetectedMap(autoDetectEduzzColumns(headers));
      } else if (platform === 'cispay') {
        const r = await parseCispayXLSX(acceptedFile);
        data = r.data; headers = r.headers;
        setAutoDetectedMap(autoDetectCispayColumns(headers));
      } else {
        return;
      }
      
      setRawData(data);
      setFileHeaders(headers);
      setStep('mapping');
    } catch (error) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleMappingConfirm = (mapping: ColumnMappingResult) => {
    try {
      if (platform === 'hotmart') {
        const result = parseHotmartData(rawData, fileHeaders, mapping);
        setHotmartTransactions(result.transactions);
        setHotmartErrors(result.errors);
        setDuplicates(result.duplicates);
        setTotalRows(result.totalRows);
      } else if (platform === 'tmb') {
        const result = parseTmbData(rawData, fileHeaders, mapping);
        setTmbTransactions(result.transactions);
        setTmbErrors(result.errors);
        setDuplicates(result.duplicates);
        setTotalRows(result.totalRows);
      } else if (platform === 'eduzz') {
        const result = parseEduzzData(rawData, fileHeaders, mapping);
        setEduzzTransactions(result.transactions);
        setEduzzErrors(result.errors);
        setDuplicates(result.duplicates);
        setTotalRows(result.totalRows);
      } else if (platform === 'cispay') {
        const result = parseCispayData(rawData, fileHeaders, mapping);
        setCispayTransactions(result.transactions);
        setCispayErrors(result.errors);
        setDuplicates(result.duplicates);
        setTotalRows(result.totalRows);
      }
      setStep('preview');
    } catch (error) {
      toast({
        title: 'Erro ao processar dados',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    setFile(null);
    setHotmartTransactions([]); setHotmartErrors([]);
    setTmbTransactions([]); setTmbErrors([]);
    setEduzzTransactions([]); setEduzzErrors([]);
    setCispayTransactions([]); setCispayErrors([]);
    setDuplicates([]); setTotalRows(0);
    setDuplicateScanResult(null);
    setStep('upload');
  };

  const handleBackToPlatform = () => {
    handleClear();
    setPlatform(null);
    setStep('platform');
  };

  // Pre-scan duplicates before import
  const handlePreImportScan = async () => {
    if (!user) return;

    setIsScanning(true);
    try {
      let scanResult: DuplicateScanResult | null = null;

      if (platform === 'hotmart') {
        scanResult = await scanHotmartDuplicates(hotmartTransactions, user.id, clientId);
      } else if (platform === 'tmb') {
        scanResult = await scanTmbDuplicates(tmbTransactions, user.id, clientId);
      } else if (platform === 'eduzz') {
        scanResult = await scanEduzzDuplicates(eduzzTransactions, user.id, clientId);
      } else if (platform === 'cispay') {
        scanResult = await scanCispayDuplicates(cispayTransactions, user.id, clientId);
      }

      if (scanResult && scanResult.duplicateMatches.length > 0) {
        setDuplicateScanResult(scanResult);
        setShowDuplicateDialog(true);
      } else {
        // No duplicates found, proceed directly
        await executeImport(scanResult?.newTransactions ?? [], [], 'skip');
      }
    } catch (error) {
      toast({
        title: 'Erro ao verificar duplicatas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDuplicateAction = async (action: DuplicateAction) => {
    setShowDuplicateDialog(false);
    if (!duplicateScanResult) return;
    await executeImport(
      duplicateScanResult.newTransactions,
      duplicateScanResult.duplicateMatches,
      action
    );
  };

  const executeImport = async (
    newTransactions: unknown[],
    duplicateMatches: DuplicateMatch[],
    mergeAction: DuplicateAction
  ) => {
    if (!user) return;

    setStep('importing');

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

      let result = { importedCount: 0, duplicateCount: 0, errorCount: 0, mergedCount: 0 };

      if (platform === 'hotmart') {
        result = await importHotmart(
          newTransactions as HotmartTransaction[],
          user.id, importRecord.id, clientId,
          duplicateMatches, mergeAction
        );
        if (hotmartErrors.length > 0) {
          const errorRecords = hotmartErrors.slice(0, 100).map(e => ({
            import_id: importRecord.id,
            row_number: e.row,
            error_type: e.type,
            error_message: e.message,
            raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
          }));
          await supabase.from('import_errors').insert(errorRecords);
          result.errorCount += hotmartErrors.length;
        }
      } else if (platform === 'tmb') {
        result = await importTmb(
          newTransactions as TmbTransaction[],
          user.id, importRecord.id, clientId,
          duplicateMatches, mergeAction
        );
        if (tmbErrors.length > 0) {
          const errorRecords = tmbErrors.slice(0, 100).map(e => ({
            import_id: importRecord.id,
            row_number: e.row,
            error_type: e.type,
            error_message: e.message,
            raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
          }));
          await supabase.from('import_errors').insert(errorRecords);
          result.errorCount += tmbErrors.length;
        }
      } else if (platform === 'eduzz') {
        result = await importEduzz(
          newTransactions as EduzzTransaction[],
          user.id, importRecord.id, clientId,
          duplicateMatches, mergeAction
        );
        if (eduzzErrors.length > 0) {
          const errorRecords = eduzzErrors.slice(0, 100).map(e => ({
            import_id: importRecord.id, row_number: e.row, error_type: e.type,
            error_message: e.message, raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
          }));
          await supabase.from('import_errors').insert(errorRecords);
          result.errorCount += eduzzErrors.length;
        }
      } else if (platform === 'cispay') {
        result = await importCispay(
          newTransactions as CispayTransaction[],
          user.id, importRecord.id, clientId,
          duplicateMatches, mergeAction
        );
        if (cispayErrors.length > 0) {
          const errorRecords = cispayErrors.slice(0, 100).map(e => ({
            import_id: importRecord.id, row_number: e.row, error_type: e.type,
            error_message: e.message, raw_data: e.rawData ? JSON.parse(JSON.stringify(e.rawData)) : null,
          }));
          await supabase.from('import_errors').insert(errorRecords);
          result.errorCount += cispayErrors.length;
        }
      }

      // Update import record
      await supabase
        .from('imports')
        .update({
          status: 'completed',
          imported_rows: result.importedCount,
          duplicate_rows: result.duplicateCount,
          error_rows: result.errorCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importRecord.id);

      setImportedCount(result.importedCount);
      setStep('complete');
      
      const mergeMsg = result.mergedCount > 0 ? ` ${result.mergedCount} registros atualizados (campos vazios preenchidos).` : '';
      toast({
        title: 'Importação concluída!',
        description: `${result.importedCount} transações importadas.${result.duplicateCount > 0 ? ` ${result.duplicateCount} duplicatas.` : ''}${mergeMsg}${result.errorCount > 0 ? ` ${result.errorCount} erros.` : ''}`,
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

  const getPlatformIcon = () => {
    if (platform === 'hotmart') return <FileSpreadsheet className="h-4 w-4" />;
    if (platform === 'tmb') return <Store className="h-4 w-4" />;
    if (platform === 'eduzz') return <CreditCard className="h-4 w-4" />;
    if (platform === 'cispay') return <GraduationCap className="h-4 w-4" />;
    return null;
  };

  const getPlatformLabel = () => {
    if (platform === 'hotmart') return 'Vendas Hotmart';
    if (platform === 'tmb') return 'Vendas TMB';
    if (platform === 'eduzz') return 'Vendas Eduzz';
    if (platform === 'cispay') return 'Vendas CIS PAY';
    return '';
  };

  const getDropZoneHint = () => {
    if (platform === 'hotmart') return 'Arraste sua planilha CSV ou XLSX para a área abaixo';
    if (platform === 'tmb') return 'Arraste sua planilha CSV (delimitador ;) para a área abaixo';
    if (platform === 'eduzz') return 'Arraste sua planilha CSV ou XLSX da Eduzz para a área abaixo';
    if (platform === 'cispay') return 'Arraste sua planilha XLSX da CIS PAY para a área abaixo';
    return '';
  };

  const getTransactionCount = () => {
    if (platform === 'hotmart') return hotmartTransactions.length;
    if (platform === 'tmb') return tmbTransactions.length;
    if (platform === 'eduzz') return eduzzTransactions.length;
    if (platform === 'cispay') return cispayTransactions.length;
    return 0;
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-3">
            <ActiveClientBlock />
            <ClientContextHeader 
              title="Importar Vendas"
              description={step === 'platform' 
                ? 'Selecione a plataforma de origem dos dados'
                : `Faça upload da sua planilha de vendas ${platform?.toUpperCase() || ''}`
              }
            />
          </div>
          {platform && (
            <Badge variant="outline" className="gap-2">
              {getPlatformIcon()}
              Template: {getPlatformLabel()}
            </Badge>
          )}
        </div>

        {/* Steps */}
        {step !== 'platform' && (
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { key: 'upload', label: '1. Upload' },
              { key: 'mapping', label: '2. Mapeamento' },
              { key: 'preview', label: '3. Preview' },
              { key: 'importing', label: '4. Importar' },
            ].map((s, index) => {
              const allSteps = ['upload', 'mapping', 'preview', 'scanning', 'importing', 'complete'];
              const stepOrder = ['upload', 'mapping', 'preview', 'importing'];
              const currentIdx = allSteps.indexOf(step);
              const thisIdx = stepOrder.indexOf(s.key);
              const isActive = step === s.key || currentIdx > allSteps.indexOf(s.key);
              
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  `}>
                    {index + 1}
                  </div>
                  <span className={step === s.key ? 'font-medium' : 'text-muted-foreground'}>
                    {s.label}
                  </span>
                  {index < 3 && <div className="w-8 h-px bg-border" />}
                </div>
              );
            })}
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
                {step === 'mapping' && 'Mapeamento de Colunas'}
                {step === 'preview' && 'Revise os dados'}
                {step === 'scanning' && 'Verificando duplicatas...'}
                {step === 'importing' && 'Importando...'}
                {step === 'complete' && 'Importação concluída!'}
              </CardTitle>
              <CardDescription>
                {step === 'upload' && getDropZoneHint()}
                {step === 'mapping' && 'Verifique e ajuste o mapeamento das colunas do arquivo para os campos do sistema'}
                {step === 'preview' && 'Confira as transações antes de confirmar a importação'}
                {step === 'scanning' && 'Comparando com registros existentes no banco'}
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

              {step === 'mapping' && platform && (
                <ColumnMappingStep
                  platform={platform}
                  fileHeaders={fileHeaders}
                  autoDetectedMap={autoDetectedMap}
                  fieldDefinitions={
                    platform === 'hotmart' ? HOTMART_FIELD_DEFINITIONS :
                    platform === 'tmb' ? TMB_FIELD_DEFINITIONS :
                    platform === 'cispay' ? CISPAY_FIELD_DEFINITIONS :
                    EDUZZ_FIELD_DEFINITIONS
                  }
                  onConfirm={handleMappingConfirm}
                  onBack={handleClear}
                />
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
                      onClick={handlePreImportScan}
                      disabled={hotmartTransactions.length === 0 || isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Confirmar Importação
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
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
                      onClick={handlePreImportScan}
                      disabled={tmbTransactions.length === 0 || isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Confirmar Importação
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
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
                      onClick={handlePreImportScan}
                      disabled={eduzzTransactions.length === 0 || isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Confirmar Importação
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === 'preview' && platform === 'cispay' && (
                <div className="space-y-6">
                  <CispayImportPreview
                    transactions={cispayTransactions}
                    errors={cispayErrors}
                    duplicates={duplicates}
                    totalRows={totalRows}
                  />
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleClear}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar
                    </Button>
                    <Button 
                      onClick={handlePreImportScan}
                      disabled={cispayTransactions.length === 0 || isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Confirmar Importação
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
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
                    {importedCount} transações importadas!
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

      {/* Duplicate Review Dialog */}
      {duplicateScanResult && platform && (
        <DuplicateReviewDialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          duplicates={duplicateScanResult.duplicateMatches}
          newCount={duplicateScanResult.newTransactions.length}
          platform={platform}
          onConfirm={handleDuplicateAction}
          isProcessing={step === 'importing'}
        />
      )}
    </MainLayout>
  );
}
