

# Adicionar Telefone dos Compradores nos Relatórios de Vendas

## Contexto

Os três geradores de relatório (Excel, CSV e PDF) e a aba consolidada não incluem o campo `buyer_phone`, embora ele exista nas tabelas `transactions`, `tmb_transactions` e `eduzz_transactions`.

## Alterações necessárias

### 1. Atualizar interfaces de transação (3 arquivos)

Adicionar `buyer_phone: string | null` nas interfaces `HotmartTransaction`, `TmbTransaction` e `EduzzTransaction` em:
- `src/lib/export/generateExcelReport.ts`
- `src/lib/export/generateCsvReport.ts`
- `src/lib/export/generatePdfReport.ts`

### 2. Incluir coluna "Telefone" nas tabelas de cada plataforma

**Excel** (`generateExcelReport.ts`):
- Hotmart: adicionar header "Telefone" e coluna `buyer_phone` na sheet individual e na sheet consolidada
- TMB: idem
- Eduzz: idem
- Consolidado: adicionar coluna "Telefone"

**CSV** (`generateCsvReport.ts`):
- Adicionar "Telefone" nos headers e `buyer_phone` nos rows de cada função (`generateHotmartCSV`, `generateTmbCSV`, `generateEduzzCSV`, `generateCombinedCSV`)

**PDF** (`generatePdfReport.ts`):
- Adicionar coluna "Telefone" nas tabelas de cada plataforma, ajustando os `colWidths` para acomodar a nova coluna

### 3. Garantir que os hooks já trazem o campo

Os hooks `useTransactions`, `useTmbTransactions` e `useEduzzTransactions` usam `select('*')`, então `buyer_phone` já está nos dados retornados. Nenhuma alteração necessária nos hooks.

## Impacto

- Nenhuma alteração de banco de dados
- Somente 3 arquivos de geração de relatório são modificados
- O campo já existe em todas as tabelas e já é retornado pelas queries

