
# Suporte a Parcelamento nas Transacoes Eduzz

## O que sera feito

Adicionar campos de parcelamento e forma de pagamento nas transacoes Eduzz, desde a importacao CSV ate a exibicao na interface.

## Etapas

### 1. Migracao do banco de dados
Adicionar 3 novas colunas na tabela `eduzz_transactions`:

| Coluna | Tipo | Default |
|---|---|---|
| `total_installments` | integer | NULL |
| `payment_method` | text | NULL |
| `payment_form` | text | NULL |

### 2. Atualizar o parser CSV
No arquivo `src/lib/parsers/eduzzParser.ts`:
- Adicionar 3 novos campos na interface `EduzzTransaction`: `total_installments`, `payment_method`, `payment_form`
- Adicionar mapeamento de colunas em `EDUZZ_COLUMNS`:
  - `totalInstallments`: `['no parcelas', 'n parcelas', 'parcelas', 'total_installments']`
  - `paymentMethod`: `['forma de pagamento', 'payment_method', 'forma pagamento']`
  - `paymentForm`: `['metodo de pagamento', 'método de pagamento', 'payment_form']`
- Mapear os valores na funcao `parseEduzzData`

### 3. Atualizar o hook de importacao
No arquivo `src/hooks/useImportTransactions.ts`:
- Incluir `total_installments`, `payment_method` e `payment_form` no objeto de insercao da funcao `importEduzz`

### 4. Atualizar a interface do hook de leitura
No arquivo `src/hooks/useEduzzTransactions.ts`:
- Adicionar `total_installments`, `payment_method` e `payment_form` na interface `EduzzTransaction`

### 5. Exibir parcelamento no card de transacao
No arquivo `src/components/eduzz/EduzzTransactionCard.tsx`:
- Importar e exibir o componente `InstallmentBadge` quando houver `total_installments > 1`
- Exibir badge com forma de pagamento (ex: "Cartao de Credito")

### 6. Exibir parcelamento no dialog de detalhes
No arquivo `src/components/eduzz/EduzzTransactionDetailDialog.tsx`:
- Adicionar linhas de informacao para "Parcelas", "Forma de Pagamento" e "Metodo de Pagamento" na secao de informacoes da venda

---

## Secao tecnica

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | `ALTER TABLE eduzz_transactions ADD COLUMN total_installments integer, ADD COLUMN payment_method text, ADD COLUMN payment_form text` |
| `src/lib/parsers/eduzzParser.ts` | Adicionar campos e mapeamentos de colunas |
| `src/hooks/useImportTransactions.ts` | Incluir novos campos no insert do `importEduzz` |
| `src/hooks/useEduzzTransactions.ts` | Adicionar campos na interface |
| `src/components/eduzz/EduzzTransactionCard.tsx` | Exibir `InstallmentBadge` e badge de pagamento |
| `src/components/eduzz/EduzzTransactionDetailDialog.tsx` | Exibir detalhes de parcelamento e pagamento |

### Impacto
- Sem quebra de compatibilidade: colunas novas sao nullable, transacoes existentes continuam funcionando
- O `InstallmentBadge` ja existe no projeto e sera reutilizado para Eduzz
