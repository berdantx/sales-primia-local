

## Problema Identificado

A importacao CSV das 120 transacoes TMB falhou por **timeout no banco de dados**. Os logs do PostgreSQL mostram erros repetidos de `"canceling statement due to statement timeout"` no momento exato da importacao.

### Causa Raiz

O `upsert` com `ignoreDuplicates: true` no Supabase JS mascara erros -- inclusive timeouts. O codigo conta todas as linhas como "importadas" sem verificar se foram realmente inseridas. Alem disso, a funcao RLS `user_has_client_access()` e executada para cada linha do batch, o que pode ser lento com batches de 50 registros.

## Plano de Correcao

### 1. Reduzir tamanho do batch de 50 para 20

Batches menores reduzem a chance de timeout no PostgreSQL.

### 2. Verificar erro real do upsert e nao ignorar silenciosamente

Atualmente o codigo conta como "importado" mesmo quando o upsert falha. Vamos checar `error` corretamente e usar `data` retornado para contagem precisa.

### 3. Adicionar retry com backoff para batches que falham

Se um batch falhar, tentar novamente com batch menor (metade do tamanho).

### 4. Usar `insert` com tratamento manual de duplicatas em vez de `upsert`

Antes de inserir, consultar quais `order_id` ja existem no banco para o `user_id`, filtrar duplicatas no frontend, e fazer `insert` simples (sem `onConflict`). Isso evita o comportamento silencioso do `ignoreDuplicates`.

### 5. Invalidar cache do TanStack Query apos importacao

Apos importacao bem-sucedida, invalidar as queries `tmb-transactions` para que os dados aparecam imediatamente na tela.

---

### Detalhes Tecnicos

**Arquivo a editar:** `src/pages/Upload.tsx`

**Secao TMB (linhas 207-258):**

```text
Fluxo atual:
  CSV -> parse -> upsert (batch 50, ignoreDuplicates) -> conta tudo como OK

Fluxo corrigido:
  CSV -> parse -> consulta order_ids existentes -> filtra duplicatas -> insert (batch 20) -> verifica erros -> retry se timeout -> invalida cache
```

**Mudancas especificas:**

1. Antes do loop de batches, buscar todos os `order_id` existentes para o `user_id`:
   ```typescript
   const { data: existing } = await supabase
     .from('tmb_transactions')
     .select('order_id')
     .eq('user_id', user.id);
   const existingIds = new Set(existing?.map(e => e.order_id));
   const newTransactions = tmbTransactions.filter(t => !existingIds.has(t.order_id));
   ```

2. Trocar `upsert` por `insert` e reduzir batch para 20

3. Checar `error` do insert e implementar retry

4. Apos conclusao, chamar `queryClient.invalidateQueries({ queryKey: ['tmb-transactions'] })`

5. Aplicar a mesma correcao para imports Hotmart e Eduzz (mesma logica)

