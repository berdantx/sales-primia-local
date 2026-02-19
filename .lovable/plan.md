

# Seletor de Tabelas no Backup

## Situacao Atual
Ao clicar "Novo Backup", todas as 26 tabelas sao exportadas automaticamente. Nao existe nenhuma interface para escolher quais tabelas incluir no backup.

## O que vai mudar

### 1. Hook `useClientSideBackup.ts`
- Exportar a constante `BACKUP_TABLES` para que o dashboard possa usar a lista
- Alterar `startBackup` para receber um parametro opcional `selectedTables: string[]`
- Se `selectedTables` for passado, exportar somente essas tabelas; senao, exportar todas (comportamento atual mantido)
- Atualizar `totalTables` no progresso para refletir a quantidade selecionada

### 2. Dashboard `BackupDashboard.tsx`
- Adicionar um card "Selecionar Tabelas" entre o header e o botao de backup
- Usar checkboxes para cada tabela, agrupadas em categorias:
  - **Dados principais**: transactions, eduzz_transactions, tmb_transactions, leads
  - **Configuracao**: clients, profiles, client_users, goals, goal_history, filter_views, app_settings, llm_integrations, external_webhooks
  - **Importacao/Exportacao**: imports, import_errors, export_jobs, backup_logs
  - **Convites**: invitations, invitation_history
  - **Logs/Auditoria**: access_logs, lead_deletion_logs, duplicate_deletion_logs, eduzz_transaction_deletion_logs, permission_audit_logs
  - **Outros**: known_landing_pages, interest_leads
- Botao "Selecionar Todas" / "Desmarcar Todas"
- Badge mostrando "X de 26 tabelas selecionadas"
- O card fica colapsavel (usando Collapsible) para nao poluir a tela -- inicia expandido na primeira vez, depois o usuario pode fechar
- Passar as tabelas selecionadas para `startBackup(selectedTables)`
- Desabilitar o botao "Novo Backup" se nenhuma tabela estiver selecionada

### Experiencia do Usuario
1. Ao abrir /backup-dashboard, ve o card com todas as tabelas ja marcadas por padrao
2. Pode desmarcar as que nao quer
3. Clica "Novo Backup" e so as selecionadas sao exportadas
4. O progresso mostra "Tabela X de Y" considerando apenas as selecionadas

### Arquivos alterados
1. `src/hooks/useClientSideBackup.ts` -- exportar BACKUP_TABLES, aceitar parametro selectedTables
2. `src/pages/BackupDashboard.tsx` -- adicionar UI de selecao com checkboxes agrupados

