

# Adicionar Exportação de Relatório de Vendas ao Dashboard Principal

## Situacao atual

O componente `ExportReportDialog` ja existe em `src/components/export/ExportReportDialog.tsx` com suporte completo a:
- Selecao de cliente (masters)
- Filtro por periodo (predefinido ou personalizado)
- Formato Excel ou CSV
- Selecao de plataformas (Hotmart, TMB, Eduzz, Consolidado)
- Resumo de KPIs

Porem, ele so e usado na pagina `ComparativeDashboard`. O Dashboard principal (`/dashboard`) nao tem nenhum botao de exportacao.

## O que sera feito

### 1. Adicionar botao "Exportar Relatorio" no Dashboard principal

No header do `src/pages/Dashboard.tsx`, ao lado dos filtros existentes, adicionar o `ExportReportDialog` passando o `clientId` atual como `defaultClientId`.

### 2. Adicionar item no menu lateral

Adicionar um item "Exportar Relatorio" no `AppSidebar.tsx` ou, alternativamente, tornar o botao mais visivel no Dashboard — a abordagem mais natural e adicionar o botao diretamente no header do Dashboard, sem precisar de pagina nova.

## Arquivo a editar

- `src/pages/Dashboard.tsx` — importar `ExportReportDialog` e renderizar no header, ao lado dos filtros de periodo/plataforma, passando o `clientId` do filtro ativo.

Alteracao minima: ~5 linhas (1 import + 1 componente no JSX).

