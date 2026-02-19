
# Exportar Apenas o Schema do Banco

## Problema Atual
O botao "Novo Backup" fica desabilitado quando nenhuma tabela esta selecionada, e o hook sempre exporta dados de tabelas mesmo quando voce so quer a estrutura do banco.

## Solucao
Adicionar um botao "Exportar Schema" dedicado e ajustar o hook para permitir exportacao sem dados.

### Mudancas

**1. `src/hooks/useClientSideBackup.ts`**
- Quando `selectedTables` for um array vazio E `includeSchema` for `true`, pular o loop de exportacao de tabelas e gerar o JSON apenas com o bloco `schema`
- Remover o fallback que substitui array vazio por todas as tabelas (atualmente na linha que faz `selectedTables || BACKUP_TABLES`)

**2. `src/pages/BackupDashboard.tsx`**
- Adicionar botao "Exportar Schema" ao lado do botao "Novo Backup"
- Ao clicar, chama `startBackup([], true)` -- nenhuma tabela, apenas schema
- Manter o botao "Novo Backup" para backup completo (dados + schema opcional)

### Experiencia do usuario
- Clicou em "Exportar Schema": baixa um JSON so com a estrutura (tabelas, indices, RLS, funcoes, triggers, foreign keys)
- Clicou em "Novo Backup": comportamento atual, exporta dados das tabelas selecionadas + schema se marcado

### Arquivos editados
1. `src/hooks/useClientSideBackup.ts` -- permitir backup sem dados
2. `src/pages/BackupDashboard.tsx` -- adicionar botao dedicado
