

# Correção de duplicatas TMB: webhook vs importação CSV

## Problema
A transação `order_id: 2012212` (cliente advmulennacarvalhodra@gmail.com) foi inserida duas vezes:
- 18:34 via **webhook** (source: 'webhook', user_id do webhook)
- 18:57 via **importação CSV** (source: 'tmb', user_id do usuário logado)

A desduplicação falha porque o webhook grava com `WEBHOOK_USER_ID` e a importação CSV grava com o `user_id` do usuário logado. Como a constraint/verificação é por `(user_id, order_id)`, o mesmo pedido passa duas vezes.

Isso inflou o faturamento em **R$ 2.397**.

## Correções

### 1. Remover o registro duplicado
- Deletar o registro da importação CSV (`id: 4db539ec-0eb4-4f0a-98e5-d8d79689fe37`), mantendo o do webhook que chegou primeiro.

### 2. Corrigir desduplicação na importação CSV
**Arquivo:** `src/hooks/useImportTransactions.ts`

Alterar `fetchExistingTmbIds` para buscar por `client_id` + `order_id` em vez de `user_id` + `order_id`:
- Antes: `supabase.from('tmb_transactions').select('order_id').eq('user_id', userId)`
- Depois: `supabase.from('tmb_transactions').select('order_id').eq('client_id', clientId)` (quando clientId disponivel, senao manter user_id como fallback)

Aplicar a mesma correção para `fetchExistingHotmartIds` e `fetchExistingEduzzIds` para consistência.

### 3. Adicionar verificação de duplicata no webhook TMB
**Arquivo:** `supabase/functions/tmb-webhook/index.ts`

Antes do upsert (linha 271), adicionar verificação por `order_id` + `client_id` (independente de `user_id`):
```text
-- Verificar se já existe transação com esse order_id para esse client
SELECT id FROM tmb_transactions WHERE order_id = X AND client_id = Y
```
Se já existir, retornar como duplicata sem inserir.

## Detalhes Técnicos

### Importação CSV - fetchExistingTmbIds corrigido
A função passará a priorizar `client_id` para deduplicação. Isso garante que independente de qual usuário importou ou se veio via webhook, o `order_id` não se repete dentro do mesmo cliente.

### Webhook TMB - verificação extra
Adicionar uma query antes do upsert que verifica existência por `(order_id, client_id)` sem depender de `user_id`. Se encontrar registro existente (de qualquer source), logar como duplicata.

### Mesma correção para Hotmart e Eduzz
Aplicar o mesmo padrão nos respectivos webhooks e funções de fetch para garantir consistência.

### Impacto
- Corrige R$ 2.397 de faturamento inflado na cliente Camila Vieira
- Previne futuras duplicatas entre webhook e importação CSV em todas as plataformas
