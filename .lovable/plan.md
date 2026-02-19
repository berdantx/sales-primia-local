
# Correcao do ID de Venda Eduzz

## Problema identificado
O webhook da Eduzz esta salvando o hash do evento (`body.id`, ex: `mb0dwlj6yu14olaibk5628dw9`) como `sale_id` em vez do ID numerico real da venda (`body.data.id`, ex: `97320984`). Isso afeta **2.152 transacoes** recebidas via webhook.

## O que sera feito

### 1. Corrigir o webhook (edge function)
**Arquivo:** `supabase/functions/eduzz-webhook/index.ts`

Alterar a linha de extracao do `saleId` (linha 197):
- **Antes:** `body.id || body.data?.id || body.sale_id`
- **Depois:** `body.data?.id || body.sale_id || body.id`

Isso garante que o ID numerico real da venda (dentro de `body.data.id`) tenha prioridade sobre o hash do evento webhook.

A mesma correcao sera aplicada no `transaction_code` salvo nos `webhook_logs` para manter consistencia.

### 2. Corrigir os dados existentes (migracao SQL)
Atualizar os 2.152 registros que ja tem o hash errado, usando os payloads armazenados na tabela `webhook_logs`:

```text
UPDATE eduzz_transactions et
SET sale_id = (wl.payload->'data'->>'id')
FROM webhook_logs wl
WHERE wl.transaction_code = et.sale_id
  AND wl.event_type LIKE 'EDUZZ%'
  AND wl.status = 'processed'
  AND wl.payload->'data'->>'id' IS NOT NULL
  AND et.source = 'webhook'
  AND et.sale_id !~ '^[0-9]+$';
```

### 3. Atualizar a constraint de unicidade
A constraint atual `(user_id, sale_id)` nao esta alinhada com a estrategia de desduplicacao por `(client_id, sale_id)`. A migracao ira:
- Remover `eduzz_transactions_user_sale_unique` em `(user_id, sale_id)`
- Criar nova constraint em `(client_id, sale_id)`

Isso tambem exige ajustar o `onConflict` no webhook de `"user_id,sale_id"` para `"client_id,sale_id"`.

### 4. Atualizar o transaction_code nos webhook_logs
Para manter consistencia, os `transaction_code` nos logs tambem serao corrigidos:

```text
UPDATE webhook_logs
SET transaction_code = (payload->'data'->>'id')
WHERE event_type LIKE 'EDUZZ%'
  AND payload->'data'->>'id' IS NOT NULL
  AND transaction_code !~ '^[0-9]+$';
```

## Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/eduzz-webhook/index.ts` | Inverter prioridade do saleId + ajustar onConflict |
| Migracao SQL | Corrigir sale_id em 2152 registros + transaction_code nos logs + atualizar constraint |

## Riscos e mitigacao
- **Duplicatas pos-correcao**: se dois registros com hashes diferentes mapearem para o mesmo sale_id numerico, a migracao tratara conflitos mantendo o registro mais recente
- **Sem downtime**: a correcao do webhook e a migracao podem ser aplicadas simultaneamente sem interromper o servico
