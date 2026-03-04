

## Plano: Carregar UTMs existentes nos filtros de exportação

### O que muda
Substituir os inputs de texto livre dos filtros UTM por **selects com as UTMs já cadastradas**, unificando os valores das 3 plataformas (Hotmart/TMB/Eduzz).

### Como
**Arquivo: `src/components/export/ExportReportDialog.tsx`**

1. Importar os 3 hooks existentes: `useFilterOptions` (Hotmart — campo `sckCodes`), `useTmbFilterOptions`, `useEduzzFilterOptions`
2. Criar um `useMemo` que unifica os valores de UTM das 3 plataformas em listas únicas deduplicated:
   - **Source**: Hotmart `sckCodes` + TMB `utm_sources` + Eduzz `utm_sources`
   - **Medium**: TMB `utm_mediums` + Eduzz `utm_mediums`
   - **Campaign**: TMB `utm_campaigns` + Eduzz `utm_campaigns`
   - **Content**: Eduzz `utm_contents`
3. Substituir os 4 `<Input>` por `<Select>` com as opções carregadas, mantendo uma opção "Todos" como valor padrão
4. Manter a lógica de filtragem existente (match exato ao invés de `.includes()` já que o valor vem de um select)

### Nenhuma mudança no backend
Os hooks e RPCs já existem e retornam os dados necessários.

