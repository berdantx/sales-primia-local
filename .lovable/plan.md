
# Correção: Webhook carregando dados da transação anterior

## Problema
No dialog de detalhes da transação Eduzz, os estados `webhookPayload`, `webhookLoaded` e `showWebhook` são mantidos entre transações diferentes. Ao abrir a transação A e carregar o webhook, depois abrir a transação B, o webhook exibido ainda é o da transação A.

## Solução
Adicionar um `useEffect` que reseta os estados do webhook sempre que a `transaction` mudar (ou quando o dialog fechar).

## Mudança

**`src/components/eduzz/EduzzTransactionDetailDialog.tsx`**

Adicionar após a linha 88 (`const isMaster = ...`):

```typescript
// Reset webhook state when transaction changes
useEffect(() => {
  setWebhookPayload(null);
  setWebhookLoading(false);
  setWebhookLoaded(false);
  setShowWebhook(false);
}, [transaction?.sale_id]);
```

Importar `useEffect` junto do `useState` na linha 1.

## Verificação adicional
O mesmo bug pode existir nos dialogs de Hotmart (`HotmartTransactionDetailDialog.tsx`) e TMB (`TmbTransactionDetailDialog.tsx`). Vou verificar e aplicar a mesma correção se necessário.

## Arquivos editados
1. `src/components/eduzz/EduzzTransactionDetailDialog.tsx`
2. `src/components/hotmart/HotmartTransactionDetailDialog.tsx` (se aplicável)
3. `src/components/tmb/TmbTransactionDetailDialog.tsx` (se aplicável)
