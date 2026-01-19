import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Eye, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { WebhookLog } from '@/hooks/useWebhookLogs';

interface ValidationAlertsCardProps {
  logs: WebhookLog[] | undefined;
  isLoading: boolean;
  onViewDetails: (log: WebhookLog) => void;
}

interface ValidationInfo {
  warnings: string[];
  errors: string[];
  price_value?: number;
  full_price_value?: number;
}

export function ValidationAlertsCard({ logs, isLoading, onViewDetails }: ValidationAlertsCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Filter logs with validation warnings (status = 'warning' or event_type contains VALIDATION)
  const validationAlerts = useMemo(() => {
    if (!logs) return [];
    return logs.filter(
      (log) => log.status === 'warning' || log.event_type.includes('VALIDATION')
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs]);

  if (isLoading) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (validationAlerts.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Nenhum Alerta de Validação</CardTitle>
              <CardDescription>
                Todas as transações recentes foram processadas sem problemas de validação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Alertas de Validação
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                    {validationAlerts.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Transações com discrepâncias de valores detectadas
                </CardDescription>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {validationAlerts.map((log) => {
                  const payload = log.payload as { _validation?: ValidationInfo } | null;
                  const validation = payload?._validation;

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-amber-500/20 bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </span>
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                              {log.event_type.replace('_VALIDATION_WARNING', '')}
                            </Badge>
                          </div>
                          
                          <p className="text-sm font-medium mb-1">
                            Transação: {log.transaction_code || 'N/A'}
                          </p>

                          {validation && (
                            <div className="space-y-1 mt-2">
                              {validation.price_value !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">price.value:</span>{' '}
                                  {validation.price_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  {' | '}
                                  <span className="font-medium">full_price.value:</span>{' '}
                                  {validation.full_price_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              )}
                              
                              {validation.warnings?.length > 0 && (
                                <div className="text-xs text-amber-600">
                                  {validation.warnings.map((w, i) => (
                                    <p key={i} className="flex items-start gap-1">
                                      <span>⚠️</span>
                                      <span>{w}</span>
                                    </p>
                                  ))}
                                </div>
                              )}
                              
                              {validation.errors?.length > 0 && (
                                <div className="text-xs text-red-600">
                                  {validation.errors.map((e, i) => (
                                    <p key={i} className="flex items-start gap-1">
                                      <span>❌</span>
                                      <span>{e}</span>
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {log.error_message && !validation && (
                            <p className="text-xs text-red-600 mt-1">
                              {log.error_message}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => onViewDetails(log)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
