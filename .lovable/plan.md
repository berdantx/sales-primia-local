
# Backup da Estrutura do Banco de Dados

## Problema
Atualmente o backup exporta apenas os **dados** das tabelas. Se ocorrer um desastre, nao temos como saber a estrutura das tabelas (colunas, tipos, indexes, politicas RLS, funcoes, triggers) para reconstruir o banco.

## Solucao
Criar uma Edge Function `export-schema` que consulta o `information_schema` e catalogo do PostgreSQL para extrair toda a estrutura do banco. O hook de backup chama essa funcao e inclui o schema no arquivo JSON final.

## O que sera exportado

1. **Tabelas e colunas**: nome, tipo, nullable, valor padrao
2. **Chaves primarias e estrangeiras**
3. **Indexes**
4. **Politicas RLS** (nome, tabela, comando, expressao)
5. **Funcoes do banco** (nome, argumentos, corpo SQL)
6. **Triggers**

## Mudancas

### 1. Nova Edge Function: `supabase/functions/export-schema/index.ts`
- Usa `SUPABASE_SERVICE_ROLE_KEY` para consultar catalogo do PostgreSQL
- Valida autenticacao do usuario (precisa ser admin/master)
- Consulta:
  - `information_schema.tables` + `information_schema.columns` (schema public)
  - `pg_indexes` para indexes
  - `pg_policies` para RLS
  - `pg_proc` / `pg_catalog` para funcoes
  - `information_schema.triggers` para triggers
  - `information_schema.table_constraints` + `key_column_usage` + `constraint_column_usage` para foreign keys
- Retorna JSON estruturado com toda a informacao

### 2. Atualizar `supabase/config.toml`
- Adicionar entrada `[functions.export-schema]` com `verify_jwt = true`

### 3. Atualizar `src/hooks/useClientSideBackup.ts`
- Adicionar etapa "Exportando estrutura..." antes da exportacao de dados
- Chamar `supabase.functions.invoke('export-schema')`
- Incluir resultado na chave `schema` do JSON final junto com `backup_info` e `data`
- Adicionar novo status no progresso: mensagem "Exportando estrutura do banco..."

### 4. Atualizar `src/pages/BackupDashboard.tsx`
- Adicionar checkbox "Incluir estrutura do banco" (marcado por padrao) separado das tabelas de dados
- Mostrar etapa de schema no progresso quando ativa

## Estrutura do JSON de backup atualizado

```text
{
  "backup_info": { ... },
  "schema": {                          <-- NOVO
    "exported_at": "2026-02-19T...",
    "tables": [
      {
        "name": "transactions",
        "columns": [
          { "name": "id", "type": "uuid", "nullable": false, "default": "gen_random_uuid()" },
          ...
        ]
      }
    ],
    "indexes": [...],
    "rls_policies": [...],
    "functions": [...],
    "triggers": [...],
    "foreign_keys": [...]
  },
  "data": { ... }
}
```

## Arquivos alterados/criados
1. `supabase/functions/export-schema/index.ts` -- nova edge function
2. `supabase/config.toml` -- adicionar config da funcao
3. `src/hooks/useClientSideBackup.ts` -- chamar export-schema e incluir no JSON
4. `src/pages/BackupDashboard.tsx` -- checkbox para incluir estrutura
