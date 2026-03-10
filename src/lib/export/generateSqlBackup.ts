/**
 * Converts backup data (Record<tableName, rows[]>) into SQL INSERT statements.
 * When schema data is provided, generates real DDL (CREATE TABLE, CREATE INDEX, etc.).
 */

const BATCH_SIZE = 100;

function escapeValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

// ── Schema → DDL helpers ──────────────────────────────────────────────

interface SchemaColumn {
  name: string;
  type: string;       // udt_name: uuid, text, timestamptz, int4, bool, jsonb, numeric, etc.
  nullable: boolean;
  default: string | null;
  max_length: number | null;
  numeric_precision: number | null;
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

interface SchemaIndex {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface SchemaPolicy {
  policy_name: string;
  table_name: string;
  command: string;
  permissive: string;
  using_expression: string | null;
  with_check_expression: string | null;
}

interface SchemaRlsEnabled {
  table_name: string;
  rls_enabled: boolean;
}

interface SchemaFunction {
  function_name: string;
  arguments: string;
  definition: string;
  language: string;
  volatility: string;
  security_definer: boolean;
}

interface SchemaTrigger {
  trigger_name: string;
  event_manipulation: string;
  event_object_table: string;
  action_timing: string;
  action_statement: string;
}

interface SchemaForeignKey {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface SchemaData {
  exported_at?: string;
  tables?: SchemaTable[];
  indexes?: SchemaIndex[];
  rls_policies?: SchemaPolicy[];
  rls_enabled?: SchemaRlsEnabled[];
  functions?: SchemaFunction[];
  triggers?: SchemaTrigger[];
  foreign_keys?: SchemaForeignKey[];
}

/** Detect primary key column(s) from indexes (pkey convention) */
function getPrimaryKeyColumns(tableName: string, indexes: SchemaIndex[]): string[] {
  const pkIdx = indexes.find(
    i => i.tablename === tableName && i.indexname.endsWith('_pkey'),
  );
  if (!pkIdx) return [];
  // extract column list from indexdef, e.g. "CREATE UNIQUE INDEX ... USING btree (id)"
  const match = pkIdx.indexdef.match(/\(([^)]+)\)/);
  if (!match) return [];
  return match[1].split(',').map(c => c.trim().replace(/"/g, ''));
}

function generateSchemaDDL(schema: SchemaData): string[] {
  const lines: string[] = [];
  const tables = schema.tables ?? [];
  const indexes = schema.indexes ?? [];
  const rlsEnabled = schema.rls_enabled ?? [];
  const policies = schema.rls_policies ?? [];
  const fks = schema.foreign_keys ?? [];
  const functions = schema.functions ?? [];
  const triggers = schema.triggers ?? [];

  lines.push('-- ============================================');
  lines.push('-- SCHEMA DDL');
  lines.push('-- ============================================');
  lines.push('');

  // ── Functions (before tables, since policies may reference them) ──
  if (functions.length > 0) {
    lines.push('-- ── Functions ──');
    lines.push('');
    for (const fn of functions) {
      if (fn.definition) {
        lines.push(fn.definition.trim() + ';');
        lines.push('');
      }
    }
  }

  // ── Tables ──
  const rlsMap = new Map(rlsEnabled.map(r => [r.table_name, r.rls_enabled]));

  for (const table of tables) {
    const pkCols = getPrimaryKeyColumns(table.name, indexes);
    lines.push(`-- Table: ${table.name}`);
    lines.push(`CREATE TABLE IF NOT EXISTS public."${table.name}" (`);

    const colDefs: string[] = [];
    for (const col of table.columns) {
      let def = `    "${col.name}" ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.default !== null && col.default !== undefined) {
        def += ` DEFAULT ${col.default}`;
      }
      colDefs.push(def);
    }

    if (pkCols.length > 0) {
      colDefs.push(`    PRIMARY KEY (${pkCols.map(c => `"${c}"`).join(', ')})`);
    }

    lines.push(colDefs.join(',\n'));
    lines.push(');');
    lines.push('');

    // Indexes for this table (skip pkey, already handled)
    const tableIndexes = indexes.filter(
      i => i.tablename === table.name && !i.indexname.endsWith('_pkey'),
    );
    for (const idx of tableIndexes) {
      lines.push(idx.indexdef + ';');
    }
    if (tableIndexes.length > 0) lines.push('');

    // RLS
    if (rlsMap.get(table.name)) {
      lines.push(`ALTER TABLE public."${table.name}" ENABLE ROW LEVEL SECURITY;`);

      const tablePolicies = policies.filter(p => p.table_name === table.name);
      for (const pol of tablePolicies) {
        let stmt = `CREATE POLICY "${pol.policy_name}" ON public."${table.name}"`;
        if (pol.command && pol.command !== 'ALL') {
          stmt += `\n  FOR ${pol.command}`;
        }
        if (pol.permissive === 'PERMISSIVE') {
          // PERMISSIVE is default, omit
        } else {
          stmt += `\n  AS RESTRICTIVE`;
        }
        if (pol.using_expression) {
          stmt += `\n  USING (${pol.using_expression})`;
        }
        if (pol.with_check_expression) {
          stmt += `\n  WITH CHECK (${pol.with_check_expression})`;
        }
        stmt += ';';
        lines.push(stmt);
        lines.push('');
      }
    }
  }

  // ── Foreign Keys ──
  if (fks.length > 0) {
    lines.push('-- ── Foreign Keys ──');
    lines.push('');
    for (const fk of fks) {
      lines.push(
        `ALTER TABLE public."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" ` +
        `FOREIGN KEY ("${fk.column_name}") REFERENCES public."${fk.foreign_table_name}" ("${fk.foreign_column_name}");`,
      );
    }
    lines.push('');
  }

  // ── Triggers ──
  if (triggers.length > 0) {
    lines.push('-- ── Triggers ──');
    lines.push('');
    for (const tr of triggers) {
      lines.push(
        `CREATE TRIGGER "${tr.trigger_name}" ${tr.action_timing} ${tr.event_manipulation} ` +
        `ON public."${tr.event_object_table}" ${tr.action_statement};`,
      );
    }
    lines.push('');
  }

  return lines;
}

// ── Main export ───────────────────────────────────────────────────────

export function generateSqlBackup(
  data: Record<string, any[]>,
  meta?: {
    createdAt?: string;
    createdBy?: string;
    totalRecords?: number;
    includesSchema?: boolean;
    schemaData?: any;
  }
): string {
  const lines: string[] = [];

  // Header
  lines.push('-- ============================================');
  lines.push('-- AnalyzeFlow Backup (SQL)');
  lines.push(`-- Gerado em: ${meta?.createdAt || new Date().toISOString()}`);
  if (meta?.createdBy) lines.push(`-- Gerado por: ${meta.createdBy}`);
  lines.push(`-- Tabelas: ${Object.keys(data).join(', ')}`);
  lines.push(`-- Total de registros: ${meta?.totalRecords ?? Object.values(data).reduce((s, r) => s + r.length, 0)}`);
  lines.push('-- ============================================');
  lines.push('');

  // Schema DDL
  if (meta?.includesSchema && meta?.schemaData) {
    const ddlLines = generateSchemaDDL(meta.schemaData as SchemaData);
    lines.push(...ddlLines);
  }

  // Data
  lines.push('BEGIN;');
  lines.push('');

  for (const [tableName, rows] of Object.entries(data)) {
    if (!rows || rows.length === 0) {
      lines.push(`-- ${tableName}: 0 registros`);
      lines.push('');
      continue;
    }

    lines.push(`-- ${tableName}: ${rows.length} registros`);

    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      lines.push(`INSERT INTO public."${tableName}" (${colList}) VALUES`);

      const valueRows = batch.map(row => {
        const vals = columns.map(col => escapeValue(row[col]));
        return `  (${vals.join(', ')})`;
      });

      lines.push(valueRows.join(',\n') + ';');
      lines.push('');
    }
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}
