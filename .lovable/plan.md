
# Exibir Data e Hora na tabela de duplicatas

## Problema
A coluna de data na aba "Por Email" da Auditoria de Duplicatas mostra apenas a data (ex: "15/12/2025"), mas precisa mostrar tambem o horario (ex: "15/12/2025 20:18:13"), consistente com o campo "Registrado em" dos dialogs de detalhes.

## Solucao
Alterar a funcao `formatDate` no arquivo `src/pages/DuplicateAudit.tsx` (linhas 28-31) para usar `formatDateTimeBR` do `@/lib/dateUtils.ts` em vez de `toLocaleDateString`, garantindo exibicao no formato `dd/MM/yyyy HH:mm:ss` no timezone de Brasilia.

## Detalhes tecnicos

### Arquivo: `src/pages/DuplicateAudit.tsx`

1. Substituir a funcao `formatDate` (linhas 28-31) para usar `formatDateTimeBR` importado de `@/lib/dateUtils`:

```
function formatDate(date: string | null) {
  if (!date) return '—';
  return formatDateTimeBR(date, 'dd/MM/yyyy HH:mm:ss');
}
```

2. Adicionar import de `formatDateTimeBR` de `@/lib/dateUtils` no topo do arquivo.

Isso afeta ambas as abas ("Por ID" e "Por Email") de forma consistente, mostrando data e hora em todas as linhas de transacao.
