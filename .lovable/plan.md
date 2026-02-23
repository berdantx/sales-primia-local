
# Modal de Resumo na Pagina de Leads

## Resumo

Ao acessar a pagina `/leads`, um modal (Dialog) sera exibido automaticamente com um resumo rapido da captacao de leads, incluindo:

1. **Titulo dinamico**: "Captacao de Leads: [Nome do Cliente] - [Ano]"
2. **Resumo por tipo de trafego**: Pago, Organico e Direto com quantidade e porcentagem
3. **Top 5 anuncios que mais convertem** (usando o RPC `get_top_ads_by_conversion` ja existente)

O modal aparece uma vez ao carregar a pagina. O usuario fecha clicando em "Fechar" ou no X.

---

## Layout do Modal

```text
+--------------------------------------------------+
| Captacao de Leads: Camila Vieira - 2026      [X]  |
+--------------------------------------------------+
|                                                    |
| Trafego Pago:      71.313  (86.4%)                |
| Trafego Organico:  11.269  (13.6%)                |
| Trafego Direto:         1  (0.0%)                 |
|                                                    |
| ------------------------------------------------- |
|                                                    |
| Top 5 - Anuncios que mais convertem                |
|                                                    |
| 1. [nome do anuncio] - X convertidos (Y%)         |
| 2. [nome do anuncio] - X convertidos (Y%)         |
| 3. [nome do anuncio] - X convertidos (Y%)         |
| 4. [nome do anuncio] - X convertidos (Y%)         |
| 5. [nome do anuncio] - X convertidos (Y%)         |
|                                                    |
|                              [Fechar]              |
+--------------------------------------------------+
```

---

## Detalhes Tecnicos

### Novo componente: `src/components/leads/LeadsSummaryDialog.tsx`

Props:
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `stats: LeadStatsOptimized | undefined` (dados de trafego ja carregados)
- `clientName: string` (nome do cliente selecionado)
- `topConversionAds: ConversionAdItem[]` (top 5 anuncios por conversao)
- `isLoadingAds: boolean`

O componente usa o `Dialog` do shadcn/ui e renderiza:
1. Titulo com nome do cliente + ano atual
2. Tres linhas com trafego pago/organico/direto (extraidas de `stats.byTrafficType`)
3. Separador
4. Lista dos top 5 anuncios por conversao com nome, quantidade de convertidos e taxa

### Alteracoes em `src/pages/Leads.tsx`

1. Adicionar estado `const [showSummary, setShowSummary] = useState(true)`
2. Buscar o nome do cliente selecionado a partir de `useClients()` + `clientId`
3. Chamar `useTopAdsByConversion` com `limit: 5` para o modal (ja existe o hook)
4. Renderizar `<LeadsSummaryDialog>` passando os dados
5. O modal abre automaticamente quando os dados de stats carregam (`isLoadingStats === false`)

### Arquivos

- **Novo**: `src/components/leads/LeadsSummaryDialog.tsx`
- **Editado**: `src/pages/Leads.tsx` (adicionar estado, importar componente, renderizar modal)
