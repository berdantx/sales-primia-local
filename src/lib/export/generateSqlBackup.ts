/**
 * Converts backup data (Record<tableName, rows[]>) into SQL INSERT statements.
 */

const BATCH_SIZE = 100;

function escapeValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // string
  return `'${String(value).replace(/'/g, "''")}'`;
}

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

  // Schema as comment block
  if (meta?.includesSchema && meta?.schemaData) {
    lines.push('-- ============================================');
    lines.push('-- SCHEMA (estrutura do banco)');
    lines.push('-- ============================================');
    const schemaJson = JSON.stringify(meta.schemaData, null, 2);
    for (const schemaLine of schemaJson.split('\n')) {
      lines.push(`-- ${schemaLine}`);
    }
    lines.push('');
  }

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
