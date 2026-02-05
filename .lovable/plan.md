
# Diagnóstico: Métricas de Anúncios Não Aparecem

## Problema Identificado

Após investigação nos logs do banco de dados, identifiquei múltiplos erros de **"canceling statement due to statement timeout"**. As consultas estão sendo canceladas porque excedem o tempo limite de execução.

## Causa Raiz

A função `get_top_ads` (e outras funções RPC similares) possui um problema de performance crítico:

```sql
-- Código problemático atual:
WITH filtered_leads AS (
    SELECT * FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND public.user_has_client_access(client_id)  -- ⚠️ Chamado para cada linha!
      ...
)
```

A função `user_has_client_access(client_id)` está sendo chamada para **cada uma das 53.516 linhas** da tabela `leads`. Esta função executa uma subconsulta que verifica:
1. Se o usuário tem role 'master'
2. Ou se existe associação na tabela `client_users`

Resultado: ~53.000 subconsultas × custo de cada verificação = **Timeout**

## Dados Confirmados no Banco

Os dados existem e estão corretos:
- **53.516 leads** totais no cliente selecionado
- **48.354 leads** com `utm_content` preenchido
- Top anúncios disponíveis (AD010, AD015, AD008, etc.)

---

## Solução Proposta

### Otimizar a função `get_top_ads`

Modificar a lógica para verificar permissões **uma única vez** no início da função, em vez de para cada linha:

```sql
CREATE OR REPLACE FUNCTION public.get_top_ads(...)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  v_is_master boolean;
  v_allowed_clients uuid[];
BEGIN
  -- ✅ Verificar permissões UMA VEZ no início
  v_is_master := public.has_role(auth.uid(), 'master');
  
  -- Se não for master, buscar lista de clientes permitidos
  IF NOT v_is_master THEN
    SELECT ARRAY_AGG(client_id) INTO v_allowed_clients
    FROM public.client_users 
    WHERE user_id = auth.uid();
  END IF;

  -- Verificação específica do cliente solicitado
  IF p_client_id IS NOT NULL THEN
    IF NOT v_is_master AND NOT (p_client_id = ANY(v_allowed_clients)) THEN
      RETURN json_build_object('items', '[]'::json, 'totalCount', 0);
    END IF;
  END IF;

  -- Query otimizada usando a lista pré-computada
  WITH filtered_leads AS (
    SELECT * FROM leads
    WHERE (p_client_id IS NULL OR client_id = p_client_id)
      AND (v_is_master OR client_id = ANY(v_allowed_clients))  -- ✅ Comparação simples
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ),
  -- ... resto da função permanece igual
```

### Funções Afetadas (Mesmo Padrão)

As seguintes funções também precisam da mesma otimização:
- `get_top_ads`
- `get_lead_stats`
- `get_eduzz_filter_options`
- `get_eduzz_sales_by_date`
- `get_eduzz_top_customers`
- `get_eduzz_transaction_stats`
- `get_tmb_filter_options`
- `get_tmb_transaction_stats`
- Outras funções que usam `user_has_client_access` na cláusula WHERE

---

## Impacto da Correção

| Antes | Depois |
|-------|--------|
| ~53.000 chamadas de função por query | 1-2 chamadas de função por query |
| Timeout frequente | Execução em milissegundos |
| Métricas não aparecem | Métricas funcionando normalmente |

---

## Passos de Implementação

1. **Criar nova migração SQL** para atualizar a função `get_top_ads` com a lógica otimizada
2. **Aplicar o mesmo padrão** às demais funções afetadas
3. **Testar** a página de Leads para confirmar que as métricas aparecem

---

## Observação Importante

Este problema provavelmente começou a aparecer porque o volume de leads cresceu para um ponto onde os timeouts começaram a ocorrer. Não está relacionado à mudança de nome do projeto de "Primia" para "Launch Pocket" - foi apenas coincidência temporal.
