import { motion } from 'framer-motion';
import { HotmartTransaction, ParseError } from '@/lib/parsers/hotmartParser';
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
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/goalCalculations';

interface ImportPreviewProps {
  transactions: HotmartTransaction[];
  errors: ParseError[];
  duplicates: string[];
  totalRows: number;
}

export function ImportPreview({ transactions, errors, duplicates, totalRows }: ImportPreviewProps) {
  const previewTransactions = transactions.slice(0, 10);
  const hasWarnings = errors.length > 0 || duplicates.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

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
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead className="text-right">Valor Bruto</TableHead>
                  <TableHead className="text-right">Valor Calculado</TableHead>
                  <TableHead>Tipo Cobrança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {transaction.transaction_code.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.product}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {transaction.buyer_name || transaction.buyer_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.currency}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.gross_value_with_taxes, transaction.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.computed_value, transaction.currency)}
                    </TableCell>
                    <TableCell>
                      {transaction.billing_type?.toLowerCase().includes('recuperador') ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/20">
                          Recuperador
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {transaction.billing_type || '-'}
                        </span>
                      )}
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
