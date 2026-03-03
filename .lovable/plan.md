

## Plano: Exportação de Leads com Filtros Avançados (UTMs, Tráfego, etc.)

### Problema Atual
O dialog de exportação (`ClientSideExportDialog`) só permite filtrar por **cliente**, **período** e **excluir testes**. As RPCs `count_leads_for_export` e `export_leads_batch` também só aceitam esses 3 parâmetros. Não é possível exportar, por exemplo, apenas leads orgânicos ou de uma campanha específica.

### Solução

**1. Atualizar as RPCs no banco de dados**

Criar uma migration que altere `count_leads_for_export` e `export_leads_batch` para aceitar parâmetros adicionais:
- `p_source` (fonte)
- `p_utm_source`, `p_utm_medium`, `p_utm_campaign`, `p_utm_content`, `p_utm_term`
- `p_traffic_type` (paid/organic/direct)
- `p_country`
- `p_page_url`
- `p_search` (busca por email/nome)

Todos opcionais (NULL = sem filtro).

**2. Atualizar o hook `useClientSideExport`**

Expandir a interface `ExportFilters` para incluir os novos campos e passá-los às RPCs.

**3. Atualizar o `ClientSideExportDialog`**

Adicionar seções de filtro no dialog:
- **Tipo de tráfego**: Pago / Orgânico / Direto (select)
- **Fonte** (select com opções disponíveis)
- **UTM Source / Medium / Campaign / Content / Term** (selects)
- **País** (select)
- **Página** (select)
- **Busca por email/nome** (input)

Opção de **"Usar filtros ativos da página"** que pré-preenche o dialog com os filtros que o usuário já tem aplicados na página de Leads.

**4. Carregar opções de filtro**

Reutilizar os dados de `useLeadStatsOptimized` (que já retorna `bySource`, `byUtmSource`, etc.) para popular os selects do dialog, ou buscar as opções via query leve.

### Detalhes Técnicos

- As RPCs serão atualizadas com `CREATE OR REPLACE FUNCTION` adicionando os novos parâmetros com default NULL
- Cada novo parâmetro adiciona uma cláusula `AND` condicional no WHERE
- O dialog receberá as opções de filtro e filtros ativos como props opcionais
- O resumo da exportação mostrará todos os filtros aplicados

### Arquivos Afetados
- **Migration SQL**: novas versões de `count_leads_for_export` e `export_leads_batch`
- `src/hooks/useClientSideExport.ts` — expandir `ExportFilters` e chamadas RPC
- `src/components/leads/ClientSideExportDialog.tsx` — adicionar UI de filtros avançados
- `src/pages/Leads.tsx` — passar filtros ativos como props ao dialog

