
# Correcao: Comissoes do Coprodutor com valores incorretos

## Problema

As queries no hook `useCoproducerCommissions` buscam **todas as linhas individuais** das tabelas de transacoes para somar no frontend. Porem, o cliente Supabase tem um **limite padrao de 1.000 linhas** por query.

Dados reais do coprodutor `bvazeua@gmail.com` para a cliente "Camila Vieira":
- Hotmart: **3.893 linhas** (so 1.000 retornadas)
- TMB: **1.241 linhas** (so 1.000 retornadas)

Isso causa uma perda significativa nos calculos. O valor correto seria ~R$ 1.870.206 (30% de R$ 6.234.020), mas o sistema mostra R$ 1.582.300.

## Solucao

Criar uma **funcao RPC no PostgreSQL** que faz a agregacao (`SUM`) direto no banco, retornando apenas os totais por produto e plataforma. Isso elimina o limite de 1.000 linhas e tambem melhora a performance (menos dados trafegados).

## Detalhes Tecnicos

### 1. Nova funcao RPC: `get_coproducer_commissions`

Parametros:
- `p_coproducer_ids` (uuid[]) - IDs dos coprodutores
- `p_date_from` (timestamptz, opcional) - filtro de periodo

Logica:
1. Busca os `coproducer_product_rates` para os IDs fornecidos
2. Para cada coprodutor/produto, faz `SUM` nas 3 tabelas (transactions, tmb_transactions, eduzz_transactions) com os filtros corretos
3. Aplica `rate_percent` no SQL
4. Retorna JSON com a estrutura: `{ coproducer_id, client_id, client_name, product_name, rate_percent, hotmart_total, tmb_total, eduzz_total, commission }`

```sql
-- Exemplo simplificado da logica
SELECT 
  cp.id as coproducer_id,
  cp.client_id,
  c.name as client_name,
  r.product_name,
  r.rate_percent,
  COALESCE((SELECT SUM(computed_value) FROM transactions 
            WHERE client_id = cp.client_id AND product = r.product_name
            AND (p_date_from IS NULL OR purchase_date >= p_date_from)), 0) as hotmart_total,
  COALESCE((SELECT SUM(ticket_value) FROM tmb_transactions 
            WHERE client_id = cp.client_id AND product = r.product_name
            AND cancelled_at IS NULL
            AND (p_date_from IS NULL OR effective_date >= p_date_from)), 0) as tmb_total,
  COALESCE((SELECT SUM(sale_value) FROM eduzz_transactions 
            WHERE client_id = cp.client_id AND product = r.product_name
            AND status = 'paid'
            AND (p_date_from IS NULL OR sale_date >= p_date_from)), 0) as eduzz_total
FROM client_coproducers cp
JOIN clients c ON c.id = cp.client_id
JOIN coproducer_product_rates r ON r.coproducer_id = cp.id
WHERE cp.id = ANY(p_coproducer_ids)
```

### 2. Atualizar `useCoproducerCommissions` em `src/hooks/useCoproducerCommissions.ts`

Substituir as 3 queries separadas (que trazem linhas individuais) por uma unica chamada `supabase.rpc('get_coproducer_commissions', ...)`. O processamento no frontend se limita a agrupar o resultado por cliente para montar a estrutura de `ClientCommissions[]`.

### 3. Pagina `Coproduction.tsx`

Nenhuma alteracao necessaria -- a interface do hook permanece a mesma (`{ clients: ClientCommissions[]; grandTotal: number }`).

### Arquivos alterados

- **Nova migration SQL**: Criar funcao `get_coproducer_commissions`
- **`src/hooks/useCoproducerCommissions.ts`**: Reescrever `useCoproducerCommissions` para usar RPC
