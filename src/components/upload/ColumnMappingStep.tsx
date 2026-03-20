import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { UploadPlatform } from './PlatformSelector';

export interface FieldMapping {
  key: string;
  label: string;
  required: boolean;
  detectedColumn: string | null;
  mappedColumn: string | null;
}

export interface ColumnMappingResult {
  [fieldKey: string]: string | null;
}

interface ColumnMappingStepProps {
  platform: UploadPlatform;
  fileHeaders: string[];
  autoDetectedMap: Record<string, string | null>;
  fieldDefinitions: { key: string; label: string; required: boolean }[];
  onConfirm: (mapping: ColumnMappingResult) => void;
  onBack: () => void;
}

const UNMAPPED = '__unmapped__';

export function ColumnMappingStep({
  platform,
  fileHeaders,
  autoDetectedMap,
  fieldDefinitions,
  onConfirm,
  onBack,
}: ColumnMappingStepProps) {
  const [mappings, setMappings] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    fieldDefinitions.forEach((f) => {
      initial[f.key] = autoDetectedMap[f.key] || null;
    });
    return initial;
  });

  const handleChange = (fieldKey: string, value: string) => {
    setMappings((prev) => ({
      ...prev,
      [fieldKey]: value === UNMAPPED ? null : value,
    }));
  };

  const handleReset = () => {
    const initial: Record<string, string | null> = {};
    fieldDefinitions.forEach((f) => {
      initial[f.key] = autoDetectedMap[f.key] || null;
    });
    setMappings(initial);
  };

  const missingRequired = fieldDefinitions.filter(
    (f) => f.required && !mappings[f.key]
  );

  const mappedCount = fieldDefinitions.filter((f) => mappings[f.key]).length;
  const totalFields = fieldDefinitions.length;

  const usedColumns = useMemo(() => {
    const used = new Set<string>();
    Object.values(mappings).forEach((v) => {
      if (v) used.add(v);
    });
    return used;
  }, [mappings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {mappedCount}/{totalFields} campos mapeados
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Resetar
        </Button>
      </div>

      {missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {missingRequired.length} campo(s) obrigatório(s) sem mapeamento:{' '}
            {missingRequired.map((f) => f.label).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3">
        {fieldDefinitions.map((field) => {
          const mapped = mappings[field.key];
          const wasAutoDetected = autoDetectedMap[field.key] === mapped && mapped !== null;

          return (
            <div
              key={field.key}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2 sm:w-1/3 min-w-0">
                {mapped ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : field.required ? (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </span>
                {wasAutoDetected && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    auto
                  </Badge>
                )}
              </div>
              <div className="sm:flex-1">
                <Select
                  value={mapped || UNMAPPED}
                  onValueChange={(v) => handleChange(field.key, v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione a coluna..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED}>
                      <span className="text-muted-foreground">— Não mapear —</span>
                    </SelectItem>
                    {fileHeaders.map((header) => {
                      const isUsed = usedColumns.has(header) && mappings[field.key] !== header;
                      return (
                        <SelectItem key={header} value={header} disabled={isUsed}>
                          {header}
                          {isUsed && ' (em uso)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          onClick={() => onConfirm(mappings)}
          disabled={missingRequired.length > 0}
        >
          Confirmar Mapeamento
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Field definitions per platform
export const HOTMART_FIELD_DEFINITIONS = [
  { key: 'transactionCode', label: 'Código da Transação', required: true },
  { key: 'product', label: 'Produto', required: false },
  { key: 'currency', label: 'Moeda', required: false },
  { key: 'country', label: 'País', required: false },
  { key: 'grossValue', label: 'Valor com Impostos', required: false },
  { key: 'grossValueNoTax', label: 'Faturamento Bruto (sem impostos)', required: false },
  { key: 'sckCode', label: 'Código SCK', required: false },
  { key: 'paymentMethod', label: 'Método de Pagamento', required: false },
  { key: 'totalInstallments', label: 'Total de Parcelas', required: false },
  { key: 'billingType', label: 'Tipo de Cobrança', required: false },
  { key: 'buyerName', label: 'Nome do Comprador', required: false },
  { key: 'buyerEmail', label: 'E-mail do Comprador', required: false },
  { key: 'purchaseDate', label: 'Data da Transação', required: false },
];

export const TMB_FIELD_DEFINITIONS = [
  { key: 'orderId', label: 'ID do Pedido', required: true },
  { key: 'product', label: 'Produto', required: false },
  { key: 'buyerName', label: 'Nome do Cliente', required: false },
  { key: 'buyerEmail', label: 'E-mail do Cliente', required: false },
  { key: 'buyerPhone', label: 'Telefone', required: false },
  { key: 'ticketValue', label: 'Valor do Ticket', required: true },
  { key: 'effectiveDate', label: 'Data Efetivado', required: false },
  { key: 'utmSource', label: 'UTM Source', required: false },
  { key: 'utmMedium', label: 'UTM Medium', required: false },
  { key: 'utmCampaign', label: 'UTM Campaign', required: false },
  { key: 'utmContent', label: 'UTM Content', required: false },
];

export const EDUZZ_FIELD_DEFINITIONS = [
  { key: 'saleId', label: 'ID da Venda', required: true },
  { key: 'invoiceCode', label: 'Código Fatura', required: false },
  { key: 'product', label: 'Produto', required: false },
  { key: 'productId', label: 'ID do Produto', required: false },
  { key: 'buyerName', label: 'Nome do Cliente', required: false },
  { key: 'buyerEmail', label: 'E-mail do Cliente', required: false },
  { key: 'buyerPhone', label: 'Telefone', required: false },
  { key: 'saleValue', label: 'Valor da Venda', required: true },
  { key: 'saleDate', label: 'Data da Venda', required: false },
  { key: 'utmSource', label: 'UTM Source', required: false },
  { key: 'utmMedium', label: 'UTM Medium', required: false },
  { key: 'utmCampaign', label: 'UTM Campaign', required: false },
  { key: 'utmContent', label: 'UTM Content', required: false },
  { key: 'totalInstallments', label: 'Parcelas', required: false },
  { key: 'paymentMethod', label: 'Forma de Pagamento', required: false },
  { key: 'paymentForm', label: 'Método de Pagamento', required: false },
];

export const CISPAY_FIELD_DEFINITIONS = [
  { key: 'saleId', label: 'ID da Venda', required: true },
  { key: 'product', label: 'Nome da Venda (Produto)', required: false },
  { key: 'productCode', label: 'Código do Curso', required: false },
  { key: 'buyerName', label: 'Nome do Cliente', required: false },
  { key: 'buyerEmail', label: 'E-mail do Cliente', required: false },
  { key: 'buyerPhone', label: 'Celular', required: false },
  { key: 'saleValue', label: 'Valor', required: true },
  { key: 'saleDate', label: 'Data de Aprovação', required: false },
  { key: 'turma', label: 'Turma', required: false },
  { key: 'promotion', label: 'Promoção', required: false },
  { key: 'unit', label: 'Unidade', required: false },
  { key: 'enrollmentType', label: 'Tipo de Matrícula', required: false },
];
