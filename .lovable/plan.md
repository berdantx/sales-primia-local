

## Plano: Remover modal automático da página de Leads

**Problema:** O `LeadsSummaryDialog` abre automaticamente toda vez que o usuário acessa `/leads` (`useState(true)`), bloqueando o acesso direto ao conteúdo.

**Mudança em `src/pages/Leads.tsx`:**
1. Remover o import do `LeadsSummaryDialog`
2. Remover o state `showSummary`
3. Remover o componente `<LeadsSummaryDialog>` do JSX
4. Limpar imports não utilizados (`useLeadSummaryStats`, `useTopAdsOptimized`, etc.) que eram exclusivos do dialog

O arquivo `src/components/leads/LeadsSummaryDialog.tsx` será mantido no projeto caso queira reutilizá-lo futuramente via botão manual.

