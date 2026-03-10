

## Adicionar backup de Schema ao card de Backup em Configurações

### Contexto
A funcionalidade de exportar schema já existe no sistema — há uma função `get_database_schema()` no banco e uma edge function `export-schema` que a chama. O **Dashboard de Backup** (`/backup-dashboard`) já possui o botão "Exportar Schema" e o checkbox "Incluir estrutura do banco". Porém, o **card de Backup em Configurações** (`/settings?tab=sistema`) onde você está agora **não oferece essa opção**.

### Plano

1. **Adicionar checkbox "Incluir estrutura do banco (Schema)"** no tab de Exportar do `BackupCard.tsx`
   - Checkbox acima do botão "Gerar e Baixar Backup", semelhante ao que já existe no BackupDashboard
   - Label: "Incluir estrutura do banco (tabelas, índices, RLS, funções)"

2. **Migrar a lógica de exportação para usar `useClientSideBackup`** (que já suporta schema via parâmetro `includeSchema`)
   - Substituir a chamada direta à edge function `export-backup` pelo hook `useClientSideBackup` que já faz o download client-side com progresso e suporte a schema
   - Isso alinha o comportamento do card de Settings com o do BackupDashboard

3. **Adicionar botão "Exportar Apenas Schema"**
   - Botão secundário que exporta somente a estrutura do banco, sem dados
   - Chama `startBackup([], true)` — mesmo padrão do BackupDashboard

### Arquivos alterados
- `src/components/settings/BackupCard.tsx` — adicionar checkbox de schema, botão de schema-only, e usar `useClientSideBackup`

