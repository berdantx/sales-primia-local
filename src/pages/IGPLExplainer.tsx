import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Activity, TrendingUp, Target, BarChart3, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Decorative gauge ── */
function MiniGauge({ value, color }: { value: number; color: string }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(value, 100) / 100);
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        className={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
      />
    </svg>
  );
}

/* ── Factor cards ── */
const factors = [
  {
    icon: TrendingUp,
    title: 'Ritmo',
    weight: '35%',
    desc: 'Mede a constância das vendas diárias em relação ao ritmo necessário para atingir a meta dentro do período. Um ritmo saudável indica previsibilidade no fluxo de caixa.',
  },
  {
    icon: Target,
    title: 'Meta',
    weight: '30%',
    desc: 'Quanto do objetivo financeiro já foi alcançado. Quando nenhuma meta está definida, o sistema assume um valor neutro (50) para não penalizar a análise.',
  },
  {
    icon: BarChart3,
    title: 'Conversão',
    weight: '20%',
    desc: 'Taxa de conversão de leads em vendas, escalada de 0 a 100. Reflete a eficiência do funil de aquisição e a qualidade do tráfego gerado.',
  },
  {
    icon: Clock,
    title: 'Timing',
    weight: '15%',
    desc: 'Relação entre o progresso da meta e o tempo decorrido no período. Um timing saudável indica que a meta está sendo alcançada proporcionalmente ao tempo.',
  },
];

/* ── Performance tiers ── */
const tiers = [
  { range: '80 – 100', label: 'Saudável', color: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600', gaugeColor: 'stroke-emerald-500', phrase: 'Performance ideal. Meta sob controle, ritmo sustentável.' },
  { range: '65 – 79', label: 'Atenção', color: 'border-amber-400', bg: 'bg-amber-400/10', text: 'text-amber-500', gaugeColor: 'stroke-amber-400', phrase: 'Execução estável, porém meta sob pressão. Monitorar ritmo.' },
  { range: '50 – 64', label: 'Risco Moderado', color: 'border-amber-600', bg: 'bg-amber-600/10', text: 'text-amber-600', gaugeColor: 'stroke-amber-500', phrase: 'Ritmo atual não sustenta fechamento no cenário projetado.' },
  { range: '0 – 49', label: 'Crítico', color: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-600', gaugeColor: 'stroke-red-500', phrase: 'Alta probabilidade de subentrega. Ação corretiva urgente.' },
];

/* ── FAQ ── */
const faq = [
  { q: 'O que acontece se não tenho meta definida?', a: 'Quando nenhuma meta está ativa, o fator "Meta" assume valor neutro (50) e o fator "Timing" também é neutralizado. Isso evita que a ausência de meta penalize ou infle artificialmente o índice.' },
  { q: 'Com que frequência o IGPL atualiza?', a: 'O IGPL é calculado em tempo real sempre que o painel é carregado. Ele reflete os dados mais recentes de vendas, leads e metas do período selecionado.' },
  { q: 'Por que o Ritmo tem o maior peso?', a: 'Porque a constância de vendas diárias é o indicador mais forte de previsibilidade. Picos isolados podem mascarar uma operação inconsistente, enquanto um ritmo estável sinaliza saúde operacional.' },
  { q: 'O IGPL funciona para todas as plataformas?', a: 'Sim. O cálculo consolida dados de todas as plataformas integradas (Hotmart, TMB, Eduzz). Ele reflete a performance global da operação.' },
  { q: 'Posso comparar o IGPL entre períodos?', a: 'Atualmente o IGPL reflete o período selecionado nos filtros do painel. Para comparação histórica, ajuste o período desejado e anote o valor.' },
];

export default function IGPLExplainer() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-12 pb-12">
        {/* ── Hero ── */}
        <section className="text-center space-y-3 pt-4">
          <div className="flex justify-center">
            <div className="relative w-[140px] h-[140px]">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  className="stroke-emerald-500" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * 0.18}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold tracking-tighter text-emerald-600">82</span>
                <span className="text-[8px] text-muted-foreground/30 font-medium tracking-widest">/ 100</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">IGPL</h1>
          <p className="text-base text-muted-foreground font-medium">Índice Global de Performance de Lançamento</p>
          <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto leading-relaxed">
            O IGPL é a métrica proprietária que sintetiza a saúde operacional do seu lançamento em um único número de 0 a 100.
            Ele combina quatro dimensões críticas para dar a você uma visão objetiva e acionável do momento da operação.
          </p>
        </section>

        <Separator />

        {/* ── Como é calculado ── */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-foreground tracking-tight">Como é calculado</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O IGPL é uma média ponderada de quatro fatores. Cada fator é normalizado para uma escala de 0 a 100 e multiplicado pelo seu peso:
          </p>
          <code className="block text-xs bg-muted/50 rounded-lg px-4 py-3 text-foreground/80 font-mono">
            IGPL = (Ritmo × 0.35) + (Meta × 0.30) + (Conversão × 0.20) + (Timing × 0.15)
          </code>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {factors.map((f) => (
              <Card key={f.title} className="border-border/60">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <f.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span className="text-sm font-bold text-foreground">{f.title}</span>
                    <span className="ml-auto text-xs font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">{f.weight}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Faixas de performance ── */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-foreground tracking-tight">Faixas de performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tiers.map((t) => (
              <Card key={t.label} className={cn('border-l-4', t.color, t.bg)}>
                <CardContent className="p-5 flex items-start gap-4">
                  <MiniGauge value={t.range.startsWith('0') ? 35 : parseInt(t.range)} color={t.gaugeColor} />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-sm font-bold', t.text)}>{t.label}</span>
                      <span className="text-xs text-muted-foreground font-medium">{t.range}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">{t.phrase}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Como interpretar ── */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-foreground tracking-tight">Como interpretar na prática</h2>
          <div className="space-y-4">
            {[
              { val: 85, label: 'Saudável', color: 'text-emerald-600', msg: 'A operação está no ritmo ideal. Continue monitorando para manter a consistência.' },
              { val: 72, label: 'Atenção', color: 'text-amber-500', msg: 'O ritmo ainda sustenta a meta, mas há sinais de pressão. Revise a taxa de conversão e o pipeline de leads.' },
              { val: 55, label: 'Risco Moderado', color: 'text-amber-600', msg: 'O cenário projetado não fecha no ritmo atual. É necessário intensificar ações de vendas ou reavaliar a meta.' },
              { val: 38, label: 'Crítico', color: 'text-red-600', msg: 'Há alta probabilidade de subentrega. Ações corretivas urgentes são necessárias — considere campanha extra ou revisão de estratégia.' },
            ].map((ex) => (
              <div key={ex.val} className="flex items-start gap-4 p-4 bg-card border border-border/60 rounded-lg">
                <span className={cn('text-2xl font-extrabold tracking-tighter shrink-0 w-12 text-right', ex.color)}>{ex.val}</span>
                <div className="space-y-0.5">
                  <span className={cn('text-xs font-bold uppercase tracking-wider', ex.color)}>{ex.label}</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ex.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── FAQ ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground tracking-tight">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm font-medium text-foreground">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </MainLayout>
  );
}
