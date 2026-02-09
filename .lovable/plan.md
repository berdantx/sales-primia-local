

## Ranking de Anuncios por Conversao (Leads que Compraram)

### O que sera feito
Criar um novo ranking que mostra **quais anuncios/campanhas trouxeram mais leads que efetivamente compraram**. Diferente do Top 5 atual (que conta apenas leads), este novo ranking cruza os emails/telefones dos leads com as transacoes (Hotmart, Eduzz, TMB) para identificar conversoes reais.

### Onde aparece
- Nova aba/secao na pagina **Funil de Conversao** (`/leads/funnel`), abaixo do funil existente
- Um card chamado **"Top Criativos por Conversao"** com toggle para alternar entre Anuncios (utm_content) e Campanhas (utm_campaign)

### O que o ranking mostra (para cada anuncio/campanha)
- Nome do anuncio ou campanha
- Quantidade de leads totais trazidos
- Quantidade de leads que compraram (convertidos)
- Taxa de conversao (%)
- Receita total gerada
- Ticket medio

### Como funciona tecnicamente

**Nova funcao RPC no banco de dados**: `get_top_ads_by_conversion`
- Recebe: `p_client_id`, `p_start_date`, `p_end_date`, `p_mode` (ads/campaigns), `p_limit`
- Agrupa leads por utm_content ou utm_campaign
- Cruza emails dos leads com emails de compradores nas 3 tabelas de transacoes (transactions, eduzz_transactions, tmb_transactions)
- Retorna ranking ordenado por numero de conversoes (ou receita)
- Usa SECURITY DEFINER com verificacao de acesso unica (mesmo padrao das RPCs existentes)

**Novo hook**: `src/hooks/useTopAdsByConversion.ts`
- Chama a RPC `get_top_ads_by_conversion`
- Retorna dados formatados para o componente

**Novo componente**: `src/components/leads/TopAdsByConversionCard.tsx`
- Card visual com ranking dos top 10 anuncios/campanhas
- Toggle para alternar entre Anuncios e Campanhas
- Cada item mostra: nome, leads totais, convertidos, taxa %, receita
- Barras de progresso proporcionais
- Icones de ranking (ouro, prata, bronze)

**Integracao na pagina LeadsFunnel.tsx**:
- Adicionar o novo card apos a secao do funil, em destaque

### Fluxo de dados

```text
leads (filtrados por cliente + periodo)
    |
    +-- Agrupados por utm_content ou utm_campaign
    |
    +-- Emails de cada grupo cruzados com:
    |       transactions.buyer_email
    |       eduzz_transactions.buyer_email
    |       tmb_transactions.buyer_email
    |
    +-- Para cada match: soma computed_value / sale_value / ticket_value
    |
    +-- Ranking final ordenado por conversoes (desc)
```

### Arquivos criados
- `src/hooks/useTopAdsByConversion.ts` -- hook para buscar dados da RPC
- `src/components/leads/TopAdsByConversionCard.tsx` -- componente visual do ranking

### Arquivos modificados
- `src/pages/LeadsFunnel.tsx` -- adicionar o novo card de ranking
- Migracao SQL -- criar funcao RPC `get_top_ads_by_conversion`

### Exemplo visual do resultado

```text
Top Criativos por Conversao
[Anuncios] [Campanhas]

#1  criativo-video-depoimento-maria    
    142 leads | 23 convertidos | 16.2% | R$ 45.800

#2  criativo-carrossel-resultados
    98 leads | 15 convertidos | 15.3% | R$ 31.200

#3  criativo-stories-urgencia
    201 leads | 18 convertidos | 9.0% | R$ 28.400
```

