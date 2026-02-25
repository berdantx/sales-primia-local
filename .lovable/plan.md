

# Vendas Internacionais + Exportacao de Clientes Compradores

## Resumo

Criar uma nova pagina dedicada a vendas internacionais (fora do Brasil) com visualizacao por pais, moeda e produto, alem de opcoes de exportacao dos clientes compradores em PDF e Excel.

## O que sera construido

### 1. Nova pagina: `/international-sales`

Uma pagina completa com:

- **KPI Cards no topo**: Total vendas internacionais (USD), numero de paises, total de transacoes internacionais, ticket medio
- **Tabela de vendas por pais**: Pais, quantidade de vendas, valor total, moeda, % do total
- **Tabela de clientes compradores internacionais**: Nome, email, pais, produto, valor, data — com paginacao e busca
- **Filtros**: Periodo (DateRangePicker), cliente (ClientSelector), plataforma (Hotmart/TMB/Eduzz/Todas)
- **Grafico**: Distribuicao de vendas por pais (barra horizontal ou pie chart com Recharts)

### 2. Exportacao de clientes compradores

Dois formatos de exportacao, acessiveis via botoes na pagina:

- **PDF** (usando jspdf + html2canvas, ja instalados): Relatorio formatado com cabecalho, periodo, tabela de compradores por pais
- **Excel** (usando xlsx, ja instalado): Planilha com todas as colunas dos compradores internacionais

### 3. Integracao no menu lateral

Adicionar o item "Internacional" no grupo "Vendas" do `AppSidebar.tsx` com o icone `Globe`.

### 4. Rota no App.tsx

Adicionar `/international-sales` com acesso para `master`, `admin` e `user`.

## Detalhes tecnicos

### Dados disponiveis

A tabela `transactions` (Hotmart) possui a coluna `country` com dados de pais. As tabelas `tmb_transactions` e `eduzz_transactions` nao possuem essa coluna — a pagina filtrara apenas transacoes com `country IS NOT NULL AND country != 'Brasil'`.

Nota: Existem paises duplicados no banco (ex: "Estados Unidos" e "United States", "Alemanha" e "Germany"). A pagina incluira normalizacao client-side para agrupar esses nomes.

### Arquivos a criar

- `src/pages/InternationalSales.tsx` — pagina principal
- `src/components/international/InternationalBuyersTable.tsx` — tabela de compradores com busca e paginacao
- `src/components/international/CountrySalesChart.tsx` — grafico de vendas por pais
- `src/components/international/ExportBuyersDialog.tsx` — modal de exportacao com opcoes PDF/Excel
- `src/lib/export/generateBuyersPdf.ts` — gerador do PDF
- `src/lib/export/generateBuyersExcel.ts` — gerador do Excel

### Arquivos a editar

- `src/components/layout/AppSidebar.tsx` — adicionar item "Internacional" no grupo Vendas
- `src/App.tsx` — adicionar rota `/international-sales`

### Hook de dados

Reutilizara `useCombinedTransactions` com filtro client-side para `country != 'Brasil'` e `country IS NOT NULL`. A interface `UnifiedTransaction` ja possui `country`, `buyer_name`, `buyer_email`, `currency`, `value`, `platform`, `product`.

### Normalizacao de paises

Mapa de normalizacao client-side:
```text
"United States" -> "Estados Unidos"
"Germany"       -> "Alemanha"
"Switzerland"   -> "Suíça"
"Australia"     -> "Austrália"
```

### Exportacao PDF

Usara `jspdf` para gerar tabela formatada com:
- Cabecalho com titulo e periodo
- Tabela de compradores: Nome, Email, Pais, Produto, Valor, Data
- Resumo por pais no rodape

### Exportacao Excel

Usara `xlsx` com duas abas:
- "Resumo por País" — pais, qtd vendas, valor total
- "Compradores" — todas as colunas dos compradores internacionais

