import { Lead } from '@/hooks/useLeads';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { formatDateTimeBR } from '@/lib/dateUtils';
import { 
  Mail, 
  Phone, 
  Globe, 
  Tag, 
  Calendar,
  Link as LinkIcon,
  Building2,
  MapPin,
  Code,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { toast } from 'sonner';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  active_campaign: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  hotmart: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  eduzz: 'bg-green-500/10 text-green-600 border-green-500/30',
  n8n: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
};

const SOURCE_LABELS: Record<string, string> = {
  active_campaign: 'Active Campaign',
  hotmart: 'Hotmart',
  eduzz: 'Eduzz',
  n8n: 'n8n',
};

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(',').map(tag => tag.trim()).filter(Boolean);
}

function InfoItem({ 
  icon: Icon, 
  label, 
  value, 
  isLink = false,
  copyable = false
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string | null | undefined;
  isLink?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };
  
  return (
    <div className="flex items-start gap-3 py-3 group">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2">
          {isLink ? (
            <a 
              href={value.startsWith('http') ? value : `https://${value}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all inline-flex items-center gap-1"
            >
              {value}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <p className="text-sm font-medium break-all">{value}</p>
          )}
          {copyable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ 
  icon: Icon, 
  title, 
  children 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function HistoryItem({ label, value }: { label: string; value: string | null | undefined }) {
  // Sempre mostrar o item, mesmo se não tiver valor
  const formattedValue = value ? formatDateTimeBR(value, 'dd/MM/yyyy HH:mm') : '-';
  
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{formattedValue}</span>
    </div>
  );
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  if (!lead) return null;

  const tags = parseTags(lead.tags);
  const source = lead.source || 'unknown';
  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();

  // Check if UTM params exist
  const hasUtmParams = lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_id || lead.utm_term || lead.utm_content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-muted/50 to-background">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold">
                {fullName || lead.email}
              </DialogTitle>
              {fullName && (
                <p className="text-sm text-muted-foreground mt-1">{lead.email}</p>
              )}
            </div>
            <Badge 
              variant="outline" 
              className={`shrink-0 font-medium ${SOURCE_COLORS[source] || 'bg-muted text-foreground'}`}
            >
              {SOURCE_LABELS[source] || source}
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-4">
            {/* Contact Info */}
            <Section icon={Mail} title="Informações de Contato">
              <InfoItem icon={Mail} label="Email" value={lead.email} copyable />
              <InfoItem icon={Phone} label="Telefone" value={lead.phone} copyable />
              <InfoItem icon={MapPin} label="Endereço IP" value={lead.ip_address} copyable />
              <InfoItem icon={Building2} label="Organização" value={lead.organization} />
            </Section>

            {/* Tags */}
            {tags.length > 0 && (
              <Section icon={Tag} title="Tags">
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* UTM Parameters */}
            {hasUtmParams && (
              <Section icon={Globe} title="Parâmetros UTM">
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoItem icon={Globe} label="Source" value={lead.utm_source} />
                  <InfoItem icon={Globe} label="Medium" value={lead.utm_medium} />
                  <InfoItem icon={Globe} label="Campaign" value={lead.utm_campaign} />
                  <InfoItem icon={Globe} label="ID" value={lead.utm_id} />
                  <InfoItem icon={Globe} label="Term" value={lead.utm_term} />
                  <InfoItem icon={Globe} label="Content" value={lead.utm_content} />
                </div>
              </Section>
            )}

            {/* Origin Info */}
            <Section icon={LinkIcon} title="Origem">
              <InfoItem icon={LinkIcon} label="Página" value={lead.page_url} isLink />
              <InfoItem icon={Tag} label="Series ID" value={lead.series_id} />
              <InfoItem icon={Code} label="External ID" value={lead.external_id} />
              {!lead.page_url && !lead.series_id && !lead.external_id && (
                <p className="text-sm text-muted-foreground py-2">Nenhuma informação de origem</p>
              )}
            </Section>

            {/* Timestamps */}
            <Section icon={Calendar} title="Histórico">
              <HistoryItem label="Criado em" value={lead.created_at} />
              <HistoryItem label="Atualizado em" value={lead.updated_at} />
              {!lead.created_at && !lead.updated_at && (
                <p className="text-sm text-muted-foreground py-2">Sem informações de data</p>
              )}
            </Section>

            {/* Raw Payload */}
            {lead.raw_payload && (
              <Section icon={Code} title="Payload Original">
                <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto max-h-64 mt-2 border">
                  {JSON.stringify(lead.raw_payload, null, 2)}
                </pre>
              </Section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
