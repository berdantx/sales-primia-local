

# Auditoria de Vendas Duplicadas

## Situacao Atual
A pagina de auditoria de duplicatas ainda nao existe no sistema. Precisa ser criada do zero para permitir a busca e resolucao de vendas duplicadas nas 3 plataformas (Hotmart, TMB, Eduzz).

## O que sera implementado

### 1. Hook `useDuplicateAudit`
Busca duplicatas nas 3 tabelas de transacoes agrupando por identificador + client_id:
- `transactions`: agrupa por `transaction_code` + `client_id`
- `tmb_transactions`: agrupa por `order_id` + `client_id`
- `eduzz_transactions`: agrupa por `sale_id` + `client_id`

Para cada grupo com mais de 1 registro, retorna os detalhes (id, email, produto, valor, source, data).

Inclui funcoes de resolucao:
- Manter webhook (deleta registros com source diferente de webhook)
- Manter CSV (deleta registros com source = webhook)
- Acao em lote para resolver multiplas de uma vez

### 2. Pagina `DuplicateAudit`
- Cards de resumo: total de duplicatas por plataforma, valor total inflado
- Tabela listando todos os grupos de duplicatas com detalhes
- Botoes de acao por grupo e selecao em lote
- Acessivel apenas para master e admin

### 3. Integracao no app
- Nova rota `/duplicate-audit` em `App.tsx`
- Link "Duplicatas" na secao "Sistema" do menu lateral (`AppSidebar.tsx`)

## Detalhes Tecnicos

### Arquivos novos
- `src/hooks/useDuplicateAudit.ts` -- Hook com queries de deteccao e funcoes de resolucao
- `src/pages/DuplicateAudit.tsx` -- Pagina com UI completa

### Arquivos modificados
- `src/components/layout/AppSidebar.tsx` -- Adicionar item "Duplicatas" com icone `Search` na secao Sistema (roles: master, admin)
- `src/App.tsx` -- Adicionar rota protegida `/duplicate-audit`

### Logica de deteccao
Para cada tabela, busca todos os registros e agrupa no cliente JS por (identifier, client_id). Grupos com count > 1 sao duplicatas. Para cada grupo, calcula o valor inflado (valor x registros extras).

### Logica de resolucao
- DELETE do registro nao desejado via Supabase client
- Invalidacao de queries react-query apos cada acao
- Toast de confirmacao

### Correcao imediata
Sera executada uma migracao SQL para deletar a duplicata ja identificada: `DELETE FROM tmb_transactions WHERE id = '17a54d76-50b0-446b-9b90-a2f2db5d3d5c'`
