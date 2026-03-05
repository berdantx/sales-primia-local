

## Plano: Adicionar canal de vendas CIS PAY

### Análise da planilha

A planilha CIS PAY tem a seguinte estrutura (campos relevantes):

| Campo planilha | Campo normalizado |
|---|---|
| ID da venda | `sale_id` (ex: 006V200000gUDPS) |
| Nome do cliente | `buyer_name` |
| Cliente pessoal: Email | `buyer_email` |
| Cliente pessoal: Celular | `buyer_phone` |
| Valor | `sale_value` (ex: BRL 35,000.00) |
| Data de Aprovação | `sale_date` |
| Código do Curso | `product_code` |
| Nome da venda | `product` (nome completo) |
| Turma | `turma` |
| Promoção | `promotion` |
| Fase | `status` (Aprovada) |
| Unidade Realizadora do Curso | `unit` |
| Tipo de Matrícula | `enrollment_type` |

### Escopo das alterações

**1. Banco de dados** — Nova tabela `cispay_transactions`
- Estrutura similar a `eduzz_transactions`, com campos específicos: `product_code`, `turma`, `promotion`, `unit`, `enrollment_type`
- RLS usando `user_has_client_access(client_id)`

**2. Parser** — `src/lib/parsers/cispayParser.ts`
- Detectar automaticamente colunas da planilha CIS (headers em português longo)
- Parsear valor no formato "BRL 35,000.00"
- Parsear data no formato DD/MM/YYYY

**3. Hooks básicos**
- `useCispayTransactions.ts` — fetch + filtros (mesmo padrão do Eduzz)
- `useCispayTransactionStatsOptimized.ts` — RPC de stats
- `useCispayFilterOptions.ts` — RPC de opções de filtro

**4. Integração no sistema existente**
- `PlatformType` passa de `'all' | 'hotmart' | 'tmb' | 'eduzz'` para incluir `'cispay'`
- `PlatformFilter` — novo botão CIS PAY
- `PlatformSelector` (upload) — nova opção CIS PAY
- `useCombinedStats` — incluir CIS PAY nos totais combinados
- `useCombinedTransactions` — incluir CIS PAY nas transações unificadas
- `useImportTransactions` — novo `importCispay` + `scanCispayDuplicates`
- Upload page — novo fluxo para CIS PAY
- Export dialog — incluir CIS PAY

**5. UI**
- `CispayImportPreview.tsx` — preview antes da importação
- `CispayTransactionCard.tsx` — card de transação
- Página `CispayTransactions.tsx` — listagem
- Sidebar — novo link

**6. RPCs no banco**
- `get_cispay_transaction_stats` — stats otimizadas
- `get_cispay_filter_options` — filtros
- `get_cispay_top_customers` — top clientes
- `get_cispay_sales_by_date` — vendas por dia

### Ordem de implementação

Pela complexidade (20+ arquivos), vou implementar em etapas:
1. Tabela + RLS + RPCs (migração)
2. Parser + Hook de importação
3. Integração no upload flow
4. Hooks de consulta + stats
5. Integração nos combinados (dashboard, filtros, exportação)
6. Página de listagem + sidebar

### Dados da planilha para importação

Após criar a infraestrutura, os 6 registros da planilha serão importados para o cliente **BVAZ Educação** (client_id: `48b4bd48-a02b-4c5b-bc4f-1669328acb4c`).

