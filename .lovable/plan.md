

# Correção de Desduplicação: CSV vs Webhook (TMB, Hotmart, Eduzz)

## Problema
Webhooks gravam com `WEBHOOK_USER_ID` e importações CSV gravam com o `user_id` do usuário logado. A verificação de duplicatas usa `(user_id, order_id)`, permitindo o mesmo pedido ser inserido duas vezes por fontes diferentes.

## Correções

### 1. Importação CSV - Priorizar `client_id` na desduplicação
**Arquivo:** `src/hooks/useImportTransactions.ts`

Alterar as 3 funções de fetch para priorizar `client_id` quando disponível:

- `fetchExistingTmbIds`: se `clientId` disponível, buscar por `client_id` apenas (sem `user_id`); senão, manter fallback por `user_id`
- `fetchExistingHotmartIds`: mesma lógica
- `fetchExistingEduzzIds`: mesma lógica

Exemplo da mudança:
```text
// Antes:
let query = supabase.from('tmb_transactions').select('order_id').eq('user_id', userId);
if (clientId) query = query.eq('client_id', clientId);

// Depois:
let query = supabase.from('tmb_transactions').select('order_id');
if (clientId) {
  query = query.eq('client_id', clientId);
} else {
  query = query.eq('user_id', userId);
}
```

### 2. Webhook TMB - Verificação pre-upsert por `(order_id, client_id)`
**Arquivo:** `supabase/functions/tmb-webhook/index.ts`

Antes do upsert na seção "Efetivado" (antes da linha 250), adicionar:

```text
// Verificar se já existe por (order_id, client_id) independente de user_id
const existingQuery = supabase
  .from("tmb_transactions")
  .select("id, source")
  .eq("order_id", orderId);

if (finalClientId) {
  existingQuery.eq("client_id", finalClientId);
}

const { data: existingTx } = await existingQuery.maybeSingle();

if (existingTx) {
  // Logar como duplicata e retornar sucesso
  ...return duplicate response...
}
```

### 3. Deletar o registro duplicado existente
Executar a remoção do registro duplicado da importação CSV (`id: 4db539ec-0eb4-4f0a-98e5-d8d79689fe37`) para corrigir o faturamento inflado em R$ 2.397.

## Detalhes Técnicos

### Ordem de execução
1. Deletar registro duplicado existente no banco
2. Atualizar `useImportTransactions.ts` (3 funções de fetch)
3. Atualizar `tmb-webhook/index.ts` (pre-upsert check)
4. Deploy do webhook atualizado

### Impacto
- Corrige R$ 2.397 de faturamento inflado
- Previne futuras duplicatas entre webhook e CSV em todas as plataformas
- Sem impacto em funcionalidade existente (fallback para `user_id` quando `client_id` não disponível)

