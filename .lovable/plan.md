

## Conversao Automatica de Moedas Exoticas para USD

### Problema atual
O sistema salva a moeda original corretamente (CVE, EUR, CHF, etc.), mas nas agregacoes e KPIs, apenas BRL e USD sao considerados. Existem 27 transacoes em 7 moedas diferentes (AED, BOB, CHF, CVE, EUR, GBP, SEK) que estao sendo ignoradas nos totais.

### Solucao proposta
Converter todas as moedas que nao sao BRL para USD no momento do recebimento do webhook. A moeda original sera preservada em um campo separado para auditoria, mas o valor convertido em USD sera usado nos calculos.

### Como funciona

1. **Edge function utilitaria de conversao**: Criar uma funcao reutilizavel que converte qualquer moeda para USD usando a API gratuita do Frankfurter (ou fallback manual para moedas exoticas como CVE).

2. **Webhook da Eduzz**: Quando a moeda recebida nao for BRL nem USD, converter o valor para USD automaticamente. Salvar:
   - `currency` = `USD` (para os calculos funcionarem)
   - `original_currency` = moeda original (ex: `CVE`)
   - `original_value` = valor original (ex: `18183.48`)

3. **Webhook da Hotmart**: Mesma logica -- moedas que nao sao BRL nem USD sao convertidas para USD.

4. **Migracao dos dados existentes**: Atualizar as 27 transacoes ja salvas com moedas exoticas, convertendo para USD e preservando os valores originais.

### Fluxo de conversao

```text
Webhook recebe transacao
    |
    +-- Moeda = BRL? --> Salva como BRL (sem conversao)
    |
    +-- Moeda = USD? --> Salva como USD (sem conversao)
    |
    +-- Outra moeda (CVE, EUR, etc.)?
            |
            +-- Busca taxa de cambio (moeda -> USD)
            |       via Frankfurter API (gratuita, sem chave)
            |
            +-- Converte valor para USD
            |
            +-- Salva:
                    currency = 'USD'
                    original_currency = 'CVE'
                    original_value = 18183.48
                    sale_value = valor em USD
```

### Detalhes tecnicos

**Migracoes SQL:**
- Adicionar colunas `original_currency` e `original_value` nas tabelas `eduzz_transactions` e `transactions` (Hotmart)
- Script de correcao para as 27 transacoes existentes com moedas exoticas

**Arquivos modificados:**
- `supabase/functions/eduzz-webhook/index.ts` -- adicionar logica de conversao antes de salvar
- `supabase/functions/hotmart-webhook/index.ts` -- mesma logica de conversao
- `src/components/eduzz/EduzzTransactionCard.tsx` -- exibir moeda original quando houver conversao (tooltip)
- `src/components/eduzz/EduzzTransactionDetailDialog.tsx` -- mostrar detalhes da conversao

**API de cambio utilizada:**
- Frankfurter API (`https://api.frankfurter.app/latest?from=CVE&to=USD`) -- gratuita, sem necessidade de chave API
- Fallback com taxas fixas aproximadas para moedas nao suportadas

### Impacto
- Todas as transacoes passam a ser contabilizadas nos KPIs (BRL ou USD)
- A moeda e valor original ficam preservados para auditoria
- Nenhuma mudanca necessaria nos hooks de estatisticas -- eles ja leem BRL e USD corretamente

