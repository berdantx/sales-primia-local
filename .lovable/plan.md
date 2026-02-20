

# Correção dos dados históricos - 670 transações Eduzz

## Status atual
- O webhook ja foi atualizado e novas transacoes usarao `price.value` corretamente.
- Faltam corrigir **670 transacoes existentes** no banco que foram salvas com `price.paid.value`.

## O que sera feito

Executar um UPDATE no banco de dados que:

1. Cruza `eduzz_transactions` com `webhook_logs` para encontrar o `price.value` correto do payload original
2. Atualiza o `sale_value` de cada transacao para o valor correto
3. Para transacoes com conversao de moeda (`original_currency` preenchido), recalcula o valor convertido proporcionalmente

### Query de correcao

```sql
WITH corrections AS (
  SELECT DISTINCT ON (et.id)
    et.id,
    et.sale_value as old_value,
    (wl.payload::jsonb->'data'->'price'->'value')::text::numeric as correct_value,
    et.original_currency,
    et.original_value
  FROM eduzz_transactions et
  JOIN webhook_logs wl ON wl.transaction_code = et.sale_id 
    AND wl.event_type LIKE 'EDUZZ%' 
    AND wl.status = 'processed'
  WHERE wl.payload::jsonb->'data'->'price'->'value' IS NOT NULL
    AND wl.payload::jsonb->'data'->'price'->'paid'->'value' IS NOT NULL
    AND (wl.payload::jsonb->'data'->'price'->'value')::text::numeric 
      != (wl.payload::jsonb->'data'->'price'->'paid'->'value')::text::numeric
    AND et.source = 'webhook'
  ORDER BY et.id, wl.created_at DESC
)
UPDATE eduzz_transactions et
SET 
  sale_value = CASE 
    WHEN c.original_currency IS NOT NULL AND c.old_value != 0 
    THEN ROUND(et.sale_value * (c.correct_value / c.old_value), 2)
    ELSE c.correct_value
  END,
  original_value = CASE 
    WHEN c.original_currency IS NOT NULL 
    THEN c.correct_value
    ELSE et.original_value
  END
FROM corrections c
WHERE et.id = c.id;
```

### Impacto estimado
- **Camila Vieira 2026 (BRL):** 231 transacoes, reducao de ~R$ 63.709
- **Paulo Vieira (BRL):** 436 transacoes, reducao de ~R$ 66.846
- **USD:** 3 transacoes com ajustes menores

### Arquivos editados
Nenhum arquivo sera editado - apenas operacao de UPDATE no banco de dados.

