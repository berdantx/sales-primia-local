

## Plano: Filtro por UTM no Relatório de Exportação

### Problema
O diálogo de exportação de relatórios não permite filtrar transações por UTM. Você quer poder exportar apenas vendas de uma UTM específica (ex: "pagina-de-vendas").

### Solução
Adicionar campos de filtro por UTM (source, medium, campaign, content) no `ExportReportDialog`. A filtragem será feita client-side sobre os dados já carregados, sem necessidade de alterar os hooks ou o banco.

### Mudanças

**1. `src/components/export/ExportReportDialog.tsx`**
- Adicionar estados para `utmSource`, `utmMedium`, `utmCampaign`, `utmContent` (campos de texto livres)
- Adicionar uma seção "Filtros por UTM" com inputs de texto no diálogo, antes da seleção de formato
- Antes de exportar, filtrar as transações carregadas:
  - **Hotmart**: filtrar por `sck_code` (campo equivalente a UTM na Hotmart)
  - **TMB**: filtrar por `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
  - **Eduzz**: filtrar por `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`
- Atualizar o resumo de exportação para mostrar os filtros UTM ativos
- Atualizar a contagem de transações para refletir os dados filtrados

**2. Exportação (sem alterações nos geradores)**
Os geradores de Excel/CSV/PDF já recebem arrays de transações — basta passar os arrays filtrados.

### Detalhes Técnicos
- Filtragem case-insensitive usando `.toLowerCase().includes()`
- Busca parcial (substring match) para facilitar o uso
- Campos opcionais — se nenhum UTM for preenchido, exporta tudo como hoje
- A seção de UTM ficará em um `Collapsible` para não poluir o diálogo quando não for necessária

