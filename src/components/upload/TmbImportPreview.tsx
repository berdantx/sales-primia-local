import { motion } from 'framer-motion';
import { TmbTransaction, TmbParseError } from '@/lib/parsers/tmbParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, AlertTriangle, CalendarX } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/goalCalculations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TmbImportPreviewProps {
  transactions: TmbTransaction[];
  errors: TmbParseError[];
  duplicates: string[];
  totalRows: number;
}

export function TmbImportPreview({ transactions, errors, duplicates, totalRows }: TmbImportPreviewProps) {
  const previewTransactions = transactions.slice(0, 10);
  
  // Date parsing stats
  const transactionsWithDate = transactions.filter(t => t.effective_date !== null);
  const transactionsWithoutDate = transactions.filter(t => t.effective_date === null);
  const dateParseRate = transactions.length > 0 
    ? Math.round((transactionsWithDate.length / transactions.length) * 100) 
    : 0;

  // Calculate total value
  const totalValue = transactions.reduce((sum, t) => sum + t.ticket_value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{transactions.length}</p>
                <p className="text-sm text-muted-foreground">Válidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{duplicates.length}</p>
                <p className="text-sm text-muted-foreground">Duplicadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errors.length}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRows}</p>
                <p className="text-sm text-muted-foreground">Total linhas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={transactionsWithoutDate.length > 0 ? 'border-warning/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dateParseRate === 100 ? 'bg-success/10' : 'bg-warning/10'}`}>
                <CalendarX className={`h-5 w-5 ${dateParseRate === 100 ? 'text-success' : 'text-warning'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{dateParseRate}%</p>
                <p className="text-sm text-muted-foreground">Com data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Value Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor total a importar</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalValue, 'BRL')}</p>
            </div>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
              TMB • Apenas BRL
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Date parsing warning */}
      {transactionsWithoutDate.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CalendarX className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-warning">
                  {transactionsWithoutDate.length} transações sem data de efetivação
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Essas transações serão importadas, mas não aparecerão em filtros de período.
                  Verifique se sua planilha contém a coluna "Data Efetivado".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Preview das primeiras 10 transações</span>
            {transactions.length > 10 && (
              <Badge variant="secondary">
                +{transactions.length - 10} não exibidas
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                 <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {transaction.order_id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.effective_date ? (
                        format(transaction.effective_date, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {transaction.product}
                    </TableCell>
                    <TableCell className="max-w-[130px] truncate">
                      {transaction.buyer_name}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {transaction.buyer_email}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.ticket_value, 'BRL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Errors List */}
      {errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Linhas com erros ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {errors.slice(0, 20).map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-destructive/5 rounded-lg"
                  >
                    <Badge variant="destructive" className="mt-0.5">
                      Linha {error.row}
                    </Badge>
                    <div>
                      <p className="text-sm">{error.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tipo: {error.type}
                      </p>
                    </div>
                  </div>
                ))}
                {errors.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    +{errors.length - 20} erros não exibidos
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
