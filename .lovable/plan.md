
# Alertas de Conversao Suspeita + Painel de Moedas

## Resumo

Implementar dois recursos complementares para monitoramento automatico de conversoes de moeda:

1. **Alertas de Conversao Suspeita** - Deteccao automatica no webhook quando uma transacao entra sem conversao adequada
2. **Painel de Moedas no Dashboard** - Card visual mostrando todas as moedas detectadas, taxas aplicadas e totais

---

## Parte 1: Alertas de Conversao Suspeita (Backend)

### O que muda

No momento da ingestao via webhook (eduzz-webhook, hotmart-webhook), apos a conversao, o sistema vai verificar se o valor convertido parece suspeito. Criterios:

- Moeda original diferente de USD/BRL, mas valor final igual ao original (indica conversao que falhou silenciosamente)
- Taxa de conversao utilizada foi "fallback" estatica (alerta informativo, nao critico)
- Moeda desconhecida sem taxa disponivel

### Implementacao

**Tabela `currency_conversion_alerts`** (nova):
- `id`, `transaction_id`, `platform` (hotmart/eduzz/tmb), `sale_id`, `original_currency`, `original_value`, `converted_value`, `conversion_rate`, `conversion_source`, `alert_type` (failed_conversion | fallback_used | unknown_currency), `resolved`, `resolved_by`, `resolved_at`, `created_at`, `client_id`

**Alteracoes nos webhooks:**
- `currency-converter.ts`: retornar um campo `suspicious: boolean` no resultado quando a conversao cair no caso final (rate=1, moeda desconhecida)
- `eduzz-webhook/index.ts` e `hotmart-webhook/index.ts`: apos converter, inserir alerta na tabela se resultado for suspeito ou fallback

---

## Parte 2: Painel de Moedas no Dashboard (Frontend)

### Card "Moedas Detectadas"

Um novo componente `CurrencyOverviewCard` exibido na pagina de Settings (visivel para master/admin) com:

- Lista de todas as moedas originais encontradas nas transacoes (EUR, CHF, GBP, DOP, etc.)
- Quantidade de transacoes por moeda
- Total convertido em USD
- Fonte da taxa utilizada (API ao vivo vs fallback estatica)
- Indicador visual: verde (API), amarelo (fallback), vermelho (sem conversao)

### Card "Alertas de Conversao"

Componente `CurrencyAlertsCard` no Settings mostrando:

- Transacoes com alertas pendentes (nao resolvidos)
- Botao para marcar como resolvido apos correcao manual
- Contagem de alertas por tipo

---

## Detalhes Tecnicos

### Arquivos novos
- `src/components/settings/CurrencyOverviewCard.tsx` - Painel de moedas
- `src/components/settings/CurrencyAlertsCard.tsx` - Card de alertas
- `src/hooks/useCurrencyOverview.ts` - Hook para buscar dados agregados de moedas
- `src/hooks/useCurrencyAlerts.ts` - Hook para buscar/resolver alertas

### Arquivos editados
- `supabase/functions/_shared/currency-converter.ts` - Adicionar campo `suspicious` ao resultado
- `supabase/functions/eduzz-webhook/index.ts` - Inserir alertas na tabela apos conversao
- `supabase/functions/hotmart-webhook/index.ts` - Inserir alertas na tabela apos conversao
- `src/pages/Settings.tsx` - Adicionar os dois novos cards (visivel para master/admin)

### Migracao SQL
```sql
CREATE TABLE currency_conversion_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  platform text NOT NULL,
  sale_id text,
  original_currency text NOT NULL,
  original_value numeric NOT NULL,
  converted_value numeric NOT NULL,
  conversion_rate numeric NOT NULL DEFAULT 1,
  conversion_source text NOT NULL DEFAULT 'none',
  alert_type text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE currency_conversion_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters and admins can view alerts"
  ON currency_conversion_alerts FOR SELECT
  USING (has_role(auth.uid(), 'master') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Masters can update alerts"
  ON currency_conversion_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'master'));

CREATE POLICY "System can insert alerts"
  ON currency_conversion_alerts FOR INSERT
  WITH CHECK (true);
```

### Fluxo de dados

O hook `useCurrencyOverview` faz queries agregadas diretas nas tabelas `transactions` e `eduzz_transactions`, agrupando por `original_currency` e contando totais. Nao precisa de tabela nova para isso.

O hook `useCurrencyAlerts` busca da tabela `currency_conversion_alerts` os alertas pendentes e permite resolve-los via mutation.
