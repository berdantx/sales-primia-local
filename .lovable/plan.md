

# Abrir detalhes da venda ao clicar na linha de duplicata por email

## O que muda
Ao clicar em qualquer linha da tabela na aba "Por Email" da Auditoria de Duplicatas, o sistema vai buscar os dados completos daquela transacao e abrir o dialog de detalhes correspondente a plataforma (Hotmart, Eduzz ou TMB), incluindo informacoes de webhook, UTM, latencia, etc.

## Como vai funcionar
1. O usuario clica em uma linha da tabela de duplicatas
2. O sistema identifica a plataforma (hotmart/eduzz/tmb) e o ID do registro
3. Busca os dados completos dessa transacao no banco
4. Abre o dialog de detalhes correto para aquela plataforma

## Detalhes tecnicos

### Arquivo: `src/pages/DuplicateAudit.tsx`

Alteracoes no componente `EmailDuplicatesTab`:

1. **Adicionar estados** para controlar o dialog de detalhes:
   - `selectedTransaction`: armazena a transacao completa carregada
   - `selectedPlatform`: identifica qual dialog abrir (hotmart/eduzz/tmb)
   - `detailOpen`: controla abertura/fechamento do dialog

2. **Funcao `handleRowClick(record)`**: ao clicar na linha da tabela:
   - Recebe o `EmailDuplicateRecord` (que tem `id` e `platform`)
   - Faz um `supabase.from(tabela).select('*').eq('id', record.id).single()`
   - Armazena o resultado e abre o dialog

3. **Renderizar os 3 dialogs** condicionalmente:
   - `HotmartTransactionDetailDialog` quando `platform === 'hotmart'`
   - `EduzzTransactionDetailDialog` quando `platform === 'eduzz'`
   - `TmbTransactionDetailDialog` quando `platform === 'tmb'`

4. **Estilo da linha**: adicionar `cursor-pointer hover:bg-muted/50` nas `TableRow` para indicar que sao clicaveis

### Importacoes adicionais necessarias
- `HotmartTransactionDetailDialog` de `@/components/hotmart/`
- `EduzzTransactionDetailDialog` de `@/components/eduzz/`
- `TmbTransactionDetailDialog` de `@/components/tmb/`
- `supabase` de `@/integrations/supabase/client`
- Tipos `Transaction`, `EduzzTransaction`, `TmbTransaction` dos hooks respectivos

### Mapeamento plataforma -> tabela
- `hotmart` -> `transactions`
- `eduzz` -> `eduzz_transactions`
- `tmb` -> `tmb_transactions`

### Nenhuma migracao necessaria
Os dados ja estao nas tabelas existentes, apenas precisamos buscar o registro completo pelo ID ao clicar.

