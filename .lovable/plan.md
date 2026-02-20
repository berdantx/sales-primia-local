

# Painel do Coprodutor

## Resumo

Criar uma pagina dedicada `/coproduction` acessivel a qualquer usuario que seja coprodutor de pelo menos um cliente. A pagina mostra todas as comissoes do usuario logado, detalhadas por produto e por canal de venda (Hotmart, TMB, Eduzz).

---

## Layout da Pagina

```text
+------------------------------------------------------+
| Minhas Coproducoes                                    |
| Acompanhe suas comissoes por produto e canal          |
+------------------------------------------------------+
| Periodo: [Ultimo dia | 7d | 30d | 90d | Tudo]       |
+------------------------------------------------------+
|                                                       |
| [Card Total] Total de comissoes no periodo: R$ X.XXX  |
|                                                       |
+------------------------------------------------------+
| Cliente: Paulo Vieira                                 |
|   Taxa   | Produto        | Hotmart | TMB  | Eduzz   |
|   30%    | Curso X        | R$ 900  | R$300| R$ 0    |
|   20%    | Mentoria Y     | R$ 400  | R$ 0 | R$200   |
|   Subtotal Paulo Vieira:  R$ 1.800                    |
+------------------------------------------------------+
| Cliente: Maria Silva                                  |
|   15%    | Produto A      | R$ 150  | R$ 0 | R$ 0    |
|   Subtotal Maria Silva:  R$ 150                       |
+------------------------------------------------------+
```

---

## Funcionalidades

1. **Filtro de periodo**: Mesmo seletor usado no Dashboard (1d, 7d, 30d, 90d, 365d, tudo, personalizado)
2. **Agrupamento por cliente**: Um accordion/card por cliente onde o usuario e coprodutor
3. **Tabela por produto**: Para cada cliente, mostra cada produto com a taxa e o valor de comissao separado por plataforma (Hotmart, TMB, Eduzz)
4. **KPI total**: Card no topo com o total geral de comissoes no periodo
5. **Indicador por plataforma**: Colunas separadas para cada canal de venda

---

## Detalhes Tecnicos

### Novo arquivo: `src/pages/Coproduction.tsx`

Pagina principal do painel. Usa:
- `useMyCoproductions()` (novo hook) para buscar TODAS as coproducoes do usuario logado (em todos os clientes)
- Para cada coproducao, busca transacoes agrupadas por produto E por plataforma
- Calcula comissao = valor_vendas * (taxa / 100)

### Novo hook: `useMyCoproductions()` (sem clientId)

Diferente do `useMyCoproduction(clientId)` existente que filtra por um cliente, este novo hook:
1. Busca todos os registros de `client_coproducers` do usuario logado (ativos)
2. Busca todas as `coproducer_product_rates` associadas
3. Busca o nome do cliente via join/lookup em `clients`
4. Retorna array de `{ clientId, clientName, rates[] }`

### Novo hook: `useCoproducerCommissions(coproductions, filters)`

Recebe as coproducoes e filtros de periodo. Para cada cliente:
1. Busca transacoes de Hotmart, TMB e Eduzz no periodo
2. Agrupa por produto
3. Calcula comissao por produto por plataforma

### Alteracoes no sidebar (`AppSidebar.tsx`)

Adicionar item "Coprodução" no grupo "Visao Geral" com icone `Handshake`, visivel para roles `['master', 'admin', 'user']`.

### Alteracoes no router (`App.tsx`)

Adicionar rota `/coproduction` apontando para a nova pagina. Nao precisa de `ProtectedRoute` com role especifico pois qualquer usuario pode ser coprodutor - a pagina mostra estado vazio se nao houver coproducoes.

### Arquivos criados

- `src/pages/Coproduction.tsx` - Pagina do painel
- `src/hooks/useCoproducerCommissions.ts` - Hook de calculo de comissoes por produto e plataforma

### Arquivos editados

- `src/hooks/useCoproducers.ts` - Adicionar `useMyCoproductions()` (busca todos os clientes)
- `src/components/layout/AppSidebar.tsx` - Adicionar item de menu "Coprodução"
- `src/App.tsx` - Adicionar rota `/coproduction`

