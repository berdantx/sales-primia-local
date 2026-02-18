

# Busca de Vendas Duplicadas

## Problema Atual
Foram encontradas vendas duplicadas no banco de dados. Exemplo: `order_id: 2012342` (sidimarconsultoria@hotmail.com) aparece 2x na tabela TMB -- uma via CSV e outra via webhook, ambas com R$ 2.397, inflando o faturamento.

## O que será implementado

### 1. Nova página "Auditoria de Duplicatas"
Uma página dedicada acessível pelo menu lateral (seção "Sistema", visível para master/admin) que:
- Escaneia as 3 tabelas de transações (Hotmart, TMB, Eduzz) buscando registros com o mesmo identificador + client_id
- Exibe um resumo com total de duplicatas encontradas por plataforma e o valor total inflado
- Lista todas as duplicatas encontradas com detalhes (email, produto, valor, origem CSV vs webhook, data)

### 2. Resolução de conflitos
Para cada grupo de duplicatas, o usuário poderá:
- **Manter webhook**: deleta o registro CSV (recomendado, pois webhook é a fonte oficial)
- **Manter CSV**: deleta o registro webhook
- **Ação em lote**: selecionar múltiplas duplicatas e resolver todas de uma vez

### 3. Correção imediata
A duplicata já identificada (`order_id: 2012342`, ids `d9025859...` e `17a54d76...`) será corrigida deletando o registro CSV (`source: tmb`, id: `17a54d76-50b0-446b-9b90-a2f2db5d3d5c`).

## Detalhes Técnicos

### Arquivos novos
- `src/pages/DuplicateAudit.tsx` -- Página principal com tabela de duplicatas e ações
- `src/hooks/useDuplicateAudit.ts` -- Hook que executa queries de agrupamento nas 3 tabelas

### Arquivos modificados
- `src/components/layout/AppSidebar.tsx` -- Adicionar link "Duplicatas" na seção Sistema
- `src/App.tsx` -- Adicionar rota `/duplicate-audit`

### Lógica de detecção (SQL via Supabase client)
```text
Para cada tabela:
  GROUP BY (order_id/transaction_code/sale_id, client_id)
  HAVING COUNT(*) > 1
```

### Ação de resolução
- Ao clicar "Manter webhook", executa DELETE do registro com `source != 'webhook'`
- Ao clicar "Manter CSV", executa DELETE do registro com `source = 'webhook'`
- Invalida queries do react-query após cada ação

### Migração SQL
- Deletar a duplicata existente: `DELETE FROM tmb_transactions WHERE id = '17a54d76-50b0-446b-9b90-a2f2db5d3d5c'`

