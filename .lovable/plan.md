

## Adicionar formato SQL ao backup

### O que muda

Atualmente o backup gera apenas JSON. Vamos adicionar a opção de exportar em formato SQL com `INSERT INTO` statements, permitindo restaurar os dados diretamente via qualquer cliente PostgreSQL.

### Plano

1. **Criar utilitário `src/lib/export/generateSqlBackup.ts`**
   - Função que converte `Record<string, any[]>` em statements SQL
   - Gera `INSERT INTO "table_name" ("col1", "col2", ...) VALUES (...)` para cada registro
   - Trata tipos: strings com escape de aspas simples, nulls, booleans, números, JSON (cast `::jsonb`)
   - Se schema estiver incluído, adiciona como comentário SQL no topo
   - Agrupa em blocos de 100 registros por `INSERT` (multi-row insert) para performance
   - Adiciona header com metadata (data, usuário, total de registros)

2. **Atualizar `useClientSideBackup.ts`**
   - Adicionar parâmetro `format: 'json' | 'sql'` ao `startBackup`
   - Quando `format === 'sql'`, chamar o utilitário para converter os dados antes de gerar o blob
   - Alterar extensão do arquivo para `.sql` e content-type para `text/sql`

3. **Atualizar `BackupCard.tsx`**
   - Adicionar seletor de formato (JSON / SQL) acima dos botões de ação
   - Passar o formato escolhido para `startBackup`

### Arquivos alterados
- `src/lib/export/generateSqlBackup.ts` (novo)
- `src/hooks/useClientSideBackup.ts`
- `src/components/settings/BackupCard.tsx`

