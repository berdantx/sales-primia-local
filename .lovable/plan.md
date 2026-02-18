

# Corrigir busca de transações no fluxo de cancelamento Eduzz

## Problema identificado
O webhook de cancelamento/chargeback recebe um `id` de evento diferente do evento de pagamento original. Exemplo:
- Evento de pagamento: `id = "abc123..."` (salvo como `sale_id`)
- Evento de cancelamento: `id = "xyz789..."` (outro ID)

Ambos compartilham o mesmo `data.id` (ID da fatura, ex: `"12345678"`), mas o codigo atual usa `body.id` como `sale_id` para buscar a transacao existente -- e nao encontra.

Quando nao encontra, tenta inserir uma nova transacao cancelada, mas falha porque a constraint `idx_eduzz_unique_transaction` (`client_id, buyer_email, sale_value, product, sale_date`) detecta duplicata.

## Solucao

Alterar o fluxo de cancelamento no `supabase/functions/eduzz-webhook/index.ts` para buscar a transacao existente de **duas formas**:

1. **Primeiro**: Tentar encontrar pelo `data.id` (ID da fatura) comparando com o campo `sale_id` existente -- cobre o caso em que o sale_id original foi o `data.id`
2. **Segundo (fallback)**: Buscar pela combinacao `(client_id, buyer_email, product, sale_date)` -- cobre o caso em que o sale_id original era o ID do evento

Se encontrar por qualquer um dos metodos, **atualizar** a transacao para `status = 'cancelado'`.

Se nao encontrar por nenhum, usar **upsert** com `onConflict: 'client_id,buyer_email,sale_value,product,sale_date'` em vez de insert simples, para evitar o erro de constraint.

## Detalhes tecnicos

### Arquivo modificado
`supabase/functions/eduzz-webhook/index.ts`

### Mudancas no fluxo de cancelamento

```text
// ANTES (nao funciona - busca pelo ID do evento)
query.eq("sale_id", saleId)  // saleId = body.id (evento)

// DEPOIS (busca pela fatura e fallback por campos unicos)
1. Extrair dataId = body.data?.id (ID da fatura)
2. Buscar por sale_id = saleId (body.id) OU sale_id = dataId
3. Se nao encontrar, buscar por (buyer_email + product + sale_date + client_id)
4. Se encontrar: UPDATE status = 'cancelado'
5. Se nao encontrar: UPSERT com onConflict na constraint existente
```

### Logica detalhada da busca

- Extrair `dataId = String(body.data?.id)` (ex: `"12345678"`)
- Query 1: `.or(\`sale_id.eq.${saleId},sale_id.eq.${dataId}\`)` filtrado por `client_id`
- Se nao retornar resultado, Query 2: buscar por `buyer_email + product + sale_date + client_id`
- Se encontrar em qualquer query: `UPDATE` com `status = 'cancelado'` e `cancelled_at`
- Se nao encontrar: usar `.upsert()` com `onConflict: "client_id,buyer_email,sale_value,product,sale_date"` para inserir sem conflito

### Nenhuma migracao necessaria
Todas as colunas e constraints ja existem. A correcao e apenas na logica do Edge Function.
