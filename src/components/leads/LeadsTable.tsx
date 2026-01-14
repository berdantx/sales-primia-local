import { useState } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDateTimeBR } from '@/lib/dateUtils';
import { FileSpreadsheet, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadDetailDialog } from './LeadDetailDialog';

interface LeadsTableProps {
  leads: Lead[];
  hasActiveFilters?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  active_campaign: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  hotmart: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  eduzz: 'bg-green-500/10 text-green-500 border-green-500/20',
  n8n: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const SOURCE_LABELS: Record<string, string> = {
  active_campaign: 'Active Campaign',
  hotmart: 'Hotmart',
  eduzz: 'Eduzz',
  n8n: 'n8n',
};

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  // Parse format: [TAG1][TAG2][TAG3]
  const matches = tags.match(/\[([^\]]+)\]/g);
  if (!matches) return [tags];
  return matches.map(m => m.replace(/[\[\]]/g, ''));
}

// Mobile lead card component
function LeadCard({ lead, onViewDetails }: { lead: Lead; onViewDetails: (lead: Lead) => void }) {
  const tags = parseTags(lead.tags);
  const source = lead.source || 'desconhecido';
  
  return (
    <Card className="mb-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onViewDetails(lead)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {lead.first_name || lead.last_name 
                ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                : lead.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
          </div>
          <Badge 
            variant="outline" 
            className={`ml-2 text-xs shrink-0 ${SOURCE_COLORS[source] || ''}`}
          >
            {SOURCE_LABELS[source] || source}
          </Badge>
        </div>
        <div className="flex justify-between items-end">
          <div className="text-xs text-muted-foreground">
            {formatDateTimeBR(lead.created_at, 'dd/MM/yy HH:mm')}
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            {lead.utm_source && (
              <Badge variant="secondary" className="text-xs">
                {lead.utm_source}
              </Badge>
            )}
          </div>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LeadsTable({ leads, hasActiveFilters }: LeadsTableProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? 'Nenhum lead encontrado com os filtros aplicados'
              : 'Nenhum lead ainda. Configure um webhook para começar a receber leads.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile: Card View */}
      <div className="md:hidden">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onViewDetails={handleViewDetails} />
        ))}
      </div>

      {/* Desktop: Table View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Data</TableHead>
                  <TableHead className="min-w-[150px]">Nome</TableHead>
                  <TableHead className="min-w-[180px]">Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>UTM Source</TableHead>
                  <TableHead className="min-w-[150px]">Tags</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const tags = parseTags(lead.tags);
                  const source = lead.source || 'desconhecido';
                  
                  return (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(lead)}
                    >
                      <TableCell className="text-xs">
                        {formatDateTimeBR(lead.created_at, 'dd/MM/yy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.first_name || lead.last_name 
                          ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate block max-w-[180px] cursor-help">
                                {lead.email}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{lead.email}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-sm">
                        {lead.phone || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={SOURCE_COLORS[source] || ''}
                        >
                          {SOURCE_LABELS[source] || source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.utm_source ? (
                          <Badge variant="secondary">{lead.utm_source}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {tags.length > 2 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-help">
                                    +{tags.length - 2}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="flex flex-col gap-1">
                                    {tags.slice(2).map((tag, i) => (
                                      <span key={i}>{tag}</span>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(lead);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <LeadDetailDialog 
        lead={selectedLead} 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
    </>
  );
}
