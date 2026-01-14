import { Lead } from '@/hooks/useLeads';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateTimeBR } from '@/lib/dateUtils';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Tag, 
  Calendar,
  Link as LinkIcon,
  Building2,
  MapPin,
  Code
} from 'lucide-react';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const matches = tags.match(/\[([^\]]+)\]/g);
  if (!matches) return [tags];
  return matches.map(m => m.replace(/[\[\]]/g, ''));
}

function InfoRow({ 
  icon: Icon, 
  label, 
  value, 
  isLink = false 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string | null | undefined;
  isLink?: boolean;
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a 
            href={value.startsWith('http') ? value : `https://${value}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm break-all">{value}</p>
        )}
      </div>
    </div>
  );
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  if (!lead) return null;

  const tags = parseTags(lead.tags);
  const source = lead.source || 'unknown';
  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">
                {fullName || lead.email}
              </DialogTitle>
              {fullName && (
                <p className="text-sm text-muted-foreground mt-1">{lead.email}</p>
              )}
            </div>
            <Badge 
              variant="outline" 
              className={SOURCE_COLORS[source] || ''}
            >
              {SOURCE_LABELS[source] || source}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 pt-4 space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações de Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Phone} label="Telefone" value={lead.phone} />
                <InfoRow icon={MapPin} label="IP" value={lead.ip_address} />
                <InfoRow icon={Building2} label="Organização" value={lead.organization} />
                <InfoRow icon={User} label="Conta" value={lead.customer_account} />
              </CardContent>
            </Card>

            {/* Tags */}
            {tags.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* UTM Parameters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Parâmetros UTM
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoRow icon={Globe} label="UTM Source" value={lead.utm_source} />
                  <InfoRow icon={Globe} label="UTM Medium" value={lead.utm_medium} />
                  <InfoRow icon={Globe} label="UTM Campaign" value={lead.utm_campaign} />
                  <InfoRow icon={Globe} label="UTM ID" value={lead.utm_id} />
                  <InfoRow icon={Globe} label="UTM Term" value={lead.utm_term} />
                  <InfoRow icon={Globe} label="UTM Content" value={lead.utm_content} />
                </div>
                {!lead.utm_source && !lead.utm_medium && !lead.utm_campaign && (
                  <p className="text-sm text-muted-foreground py-2">Nenhum parâmetro UTM registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Origin Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Origem
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoRow icon={LinkIcon} label="Página" value={lead.page_url} isLink />
                <InfoRow icon={Tag} label="Series ID" value={lead.series_id} />
                <InfoRow icon={Code} label="External ID" value={lead.external_id} />
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Criado em</span>
                    <span className="text-sm font-medium">
                      {formatDateTimeBR(lead.created_at, 'dd/MM/yyyy HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Atualizado em</span>
                    <span className="text-sm font-medium">
                      {formatDateTimeBR(lead.updated_at, 'dd/MM/yyyy HH:mm:ss')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Raw Payload */}
            {lead.raw_payload && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Payload Original
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-48">
                    {JSON.stringify(lead.raw_payload, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
