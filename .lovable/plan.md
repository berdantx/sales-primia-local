

# Corrigir Bugs no Webhook TMB

## Problemas
Os logs confirmam dois bugs ativos no `tmb-webhook`:

1. **PGRST116**: `.maybeSingle()` falha quando existem 2+ registros com mesmo `order_id` (duplicatas no banco)
2. **23505**: Fallback de `.insert()` falha por constraint `(user_id, order_id)` quando a transacao ja existe

## Correções no arquivo `supabase/functions/tmb-webhook/index.ts`

### Correção 1: Busca de cancelamento (linhas ~158-162)
Trocar `.maybeSingle()` por query sem limit, pegando array de resultados:

```typescript
const { data: existingRows, error: findError } = await supabase
  .from("tmb_transactions")
  .select("id")
  .eq("order_id", orderId);

const existing = existingRows?.[0];
```

### Correção 2: Atualizar TODAS as duplicatas encontradas
Quando multiplas linhas existem para o mesmo `order_id`, atualizar todas para `cancelado`:

```typescript
if (existingRows && existingRows.length > 0) {
  const ids = existingRows.map(r => r.id);
  await supabase
    .from("tmb_transactions")
    .update({ status: "cancelado", cancelled_at: new Date().toISOString() })
    .in("id", ids);
}
```

### Correção 3: Fallback insert → upsert
Quando nenhuma transacao existente e encontrada mas a constraint impede insert, usar `upsert`:

```typescript
const { error: insertError } = await supabase
  .from("tmb_transactions")
  .upsert({
    ...transactionData,
    status: "cancelado",
    cancelled_at: new Date().toISOString(),
  }, {
    onConflict: "user_id,order_id",
    ignoreDuplicates: false,
  });
```

Nenhuma alteracao de banco necessaria. Apenas o edge function precisa ser atualizado e redeployado.

