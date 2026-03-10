

## Gerar DDL real (CREATE TABLE, CREATE INDEX, etc.) no backup SQL

### Problema
Atualmente, quando o schema é incluído no backup SQL, ele é exportado como um bloco JSON dentro de comentários SQL (`-- { ... }`). O usuário quer DDL executável: `CREATE TABLE`, `CREATE INDEX`, políticas RLS, etc.

### O que será feito

Atualizar `src/lib/export/generateSqlBackup.ts` para converter os dados do schema (retornados pela função `get_database_schema()`) em statements DDL reais:

1. **CREATE TABLE** — Para cada tabela, gerar a definição com colunas, tipos PostgreSQL (`udt_name`), `NOT NULL`, `DEFAULT`, e `PRIMARY KEY`
2. **CREATE INDEX** — Usar o campo `indexdef` que já vem pronto do `pg_indexes` (ex: `CREATE INDEX idx_access_logs_user ON public.access_logs USING btree (user_id)`)
3. **ALTER TABLE ... ENABLE ROW LEVEL SECURITY** — Para tabelas com RLS ativado
4. **CREATE POLICY** — Gerar as políticas RLS com `USING` e `WITH CHECK`
5. **Foreign Keys** — Gerar `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
6. **Functions** — Usar o campo `definition` que já vem pronto do `pg_get_functiondef()`
7. **Triggers** — Gerar `CREATE TRIGGER` statements

O mapeamento de tipos usará `udt_name` do `information_schema.columns` (ex: `uuid`, `text`, `timestamptz`, `int4`, `bool`, `jsonb`, `numeric`).

### Estrutura do SQL gerado

```text
-- ============================================
-- SCHEMA DDL
-- ============================================

-- Table: access_logs
CREATE TABLE IF NOT EXISTS public."access_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid,
    "email" text,
    "event_type" text NOT NULL,
    "ip_address" text,
    "created_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("id")
);

CREATE INDEX idx_access_logs_user ON public.access_logs ...;

ALTER TABLE public."access_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can view all access logs" ON public."access_logs"
  FOR SELECT USING (has_role(auth.uid(), 'master'::app_role));

-- ... depois vêm os INSERT INTO com dados
```

### Arquivo alterado
- `src/lib/export/generateSqlBackup.ts` — substituir o bloco de schema-como-comentário por geração de DDL real a partir do JSON retornado pelo RPC

