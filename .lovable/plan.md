

## Exportacao de Leads com Selecao de Campos

### O que muda

O dialog de exportacao de leads vai ganhar uma nova secao onde voce podera **escolher quais campos** deseja incluir no CSV exportado. Alem do filtro de periodo que ja existe, voce vai poder marcar/desmarcar campos como Telefone, Email, Origem, UTMs, etc.

### Como vai funcionar

1. **Selecao de campos**: Uma lista de checkboxes com todos os 14 campos disponiveis (Data, Nome, Email, Telefone, Fonte, UTM Source, UTM Medium, UTM Campaign, UTM Content, Tags, Pagina, Pais, Cidade, Tipo Trafego). Por padrao, todos estarao selecionados.

2. **Botoes rapidos**: "Selecionar todos" e "Limpar selecao" para facilitar a escolha.

3. **Resumo atualizado**: O resumo da exportacao mostrara quantos campos foram selecionados.

4. **CSV dinamico**: O arquivo gerado contera apenas as colunas selecionadas, tanto nos cabecalhos quanto nos dados.

### Detalhes tecnicos

**Arquivos modificados:**

1. **`src/hooks/useClientSideExport.ts`**
   - Adicionar `selectedFields: string[]` ao tipo `ExportFilters`
   - Refatorar `CSV_HEADERS` e `leadToCSVRow` para aceitar uma lista de campos selecionados, filtrando dinamicamente quais colunas incluir no CSV
   - Definir uma constante `AVAILABLE_FIELDS` com o mapeamento de cada campo (key, label, extractor)

2. **`src/components/leads/ClientSideExportDialog.tsx`**
   - Adicionar estado `selectedFields` (array de strings, inicializado com todos os campos)
   - Renderizar uma secao de checkboxes organizados em grid (2 colunas) entre o filtro de periodo e o checkbox de excluir testes
   - Adicionar botoes "Selecionar todos" / "Limpar selecao"
   - Passar `selectedFields` para o `startExport`
   - Ampliar o dialog para `sm:max-w-lg` para acomodar os checkboxes
   - Mostrar quantidade de campos selecionados no resumo

**Nenhuma alteracao no banco de dados e necessaria** -- a RPC `export_leads_batch` ja retorna todos os campos; a filtragem de colunas sera feita no lado do cliente ao montar o CSV.

