import { Lightbulb } from 'lucide-react';

interface DiagnosticBulletsProps {
  byTrafficType: Record<string, number>;
  byCountry: Record<string, number>;
  topContentName?: string;
  total: number;
}

export function DiagnosticBullets({ byTrafficType, byCountry, topContentName, total }: DiagnosticBulletsProps) {
  if (total === 0) return null;

  const paid = byTrafficType['paid'] || 0;
  const organic = byTrafficType['organic'] || 0;
  const paidShare = total > 0 ? (paid / total) * 100 : 0;
  const organicShare = total > 0 ? (organic / total) * 100 : 0;

  // Top country
  const sortedCountries = Object.entries(byCountry)
    .filter(([c]) => c !== 'Não identificado' && c !== 'Desconhecido')
    .sort(([, a], [, b]) => b - a);
  const topCountry = sortedCountries[0];

  const bullets: string[] = [];

  if (paidShare > organicShare) {
    bullets.push(`Tráfego pago concentra ${paidShare.toFixed(0)}% da aquisição — monitore CAC.`);
  } else if (organicShare > paidShare) {
    bullets.push(`Orgânico lidera com ${organicShare.toFixed(0)}% — base sólida de aquisição.`);
  } else {
    bullets.push('Pago e orgânico equilibrados — diversificação saudável.');
  }

  if (topCountry) {
    const [country, count] = topCountry;
    const share = ((count / total) * 100).toFixed(0);
    bullets.push(`${country} concentra ${share}% dos leads — principal mercado.`);
  }

  if (topContentName) {
    bullets.push(`"${topContentName.substring(0, 40)}${topContentName.length > 40 ? '…' : ''}" é o criativo com maior volume.`);
  }

  return (
    <div className="bg-card border border-border/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-500" strokeWidth={1.75} />
        <span className="text-sm font-semibold text-foreground">Diagnóstico Rápido</span>
      </div>
      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary mt-0.5">•</span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
