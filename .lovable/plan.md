

# Correção: Usar price.value ao invés de paid.value nas transações Eduzz

## Resumo
Inverter a prioridade no webhook da Eduzz para usar `price.value` (valor do produto/recebido) ao invés de `price.paid.value` (valor pago pelo cliente). Corrigir as 671 transações existentes no banco.

## Impacto estimado
- **Camila Vieira 2026 (BRL):** 231 transações, redução de R$ 63.709,33
- **Camila Vieira 2026 (USD):** 1 transação, +$0,01 (desprezível)
- **Paulo Vieira (BRL):** 436 transações, redução de R$ 66.846,07
- **Paulo Vieira (USD):** 2 transações, +$12.056,69 (investigar se necessário)

## Mudanças

### 1. Webhook - `supabase/functions/eduzz-webhook/index.ts`

Inverter prioridade em 2 locais:

**Fluxo de cancelamento (~linha 221):**
```typescript
// De:
const saleValue = priceData?.paid?.value || priceData?.value || ...
// Para:
const saleValue = priceData?.value || priceData?.paid?.value || ...
```

**Fluxo de venda aprovada (~linha 455):**
```typescript
// De:
const saleValue = priceData?.paid?.value || priceData?.value || ...
// Para:
const saleValue = priceData?.value || priceData?.paid?.value || ...
```

### 2. Correção de dados existentes

Executar UPDATE no banco cruzando `eduzz_transactions` com `webhook_logs` para extrair o `price.value` correto do payload original e atualizar o `sale_value` das 671 transações afetadas. Transações com conversão de moeda (original_currency preenchido) terão o valor recalculado proporcionalmente.

### Arquivos editados
1. `supabase/functions/eduzz-webhook/index.ts`

### Operação de banco
- UPDATE em `eduzz_transactions` via dados do `webhook_logs`

