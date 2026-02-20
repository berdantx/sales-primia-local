

# Coprodutores: Porcentagem por Produto por Cliente

## Resumo

Permitir que cada cliente tenha um ou mais coprodutores, cada um com porcentagens configuradas por produto. O coprodutor logado vera no Dashboard um resumo dos seus ganhos de coprodução.

---

## Parte 1: Banco de Dados

### Nova tabela `client_coproducers`

Armazena quais usuarios sao coprodutores de quais clientes.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| client_id | uuid NOT NULL | Cliente |
| user_id | uuid NOT NULL | Usuario coprodutor |
| is_active | boolean DEFAULT true | Ativo/inativo |
| created_at | timestamptz | Data de criacao |
| UNIQUE(client_id, user_id) | | Evita duplicatas |

### Nova tabela `coproducer_product_rates`

Armazena a porcentagem de cada coprodutor por produto.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| coproducer_id | uuid NOT NULL FK | Referencia `client_coproducers.id` |
| product_name | text NOT NULL | Nome do produto (conforme aparece nas transacoes) |
| rate_percent | numeric NOT NULL | Porcentagem (ex: 30 = 30%) |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |
| UNIQUE(coproducer_id, product_name) | | Uma taxa por produto por coprodutor |

### RLS

- Masters podem CRUD ambas as tabelas
- Usuarios podem ver seus proprios registros de coproducao (SELECT onde user_id = auth.uid())

---

## Parte 2: Interface de Gestao (Pagina de Clientes)

### Novo componente `ClientCoproducersDialog`

Acessivel via botao na tabela de clientes (ao lado do botao "Gerenciar Usuarios"). Funcionalidades:

1. **Adicionar coprodutor**: Selecionar usuario existente do sistema
2. **Configurar taxas por produto**: Para cada coprodutor, listar os produtos do cliente (extraidos das transacoes existentes) e permitir definir a porcentagem
3. **Ativar/desativar coprodutor**: Toggle sem excluir historico
4. **Remover coprodutor**: Com confirmacao

### Layout do dialog

```text
+------------------------------------------+
| Coprodutores de [Nome do Cliente]        |
+------------------------------------------+
| [+ Adicionar Coprodutor]                 |
|                                          |
| Bruno Vaz                    [Ativo]     |
|   Produto A ................ 30%         |
|   Produto B ................ 20%         |
|   [+ Adicionar produto]                 |
|                                          |
| Maria Silva                  [Ativo]     |
|   Produto A ................ 15%         |
|   [+ Adicionar produto]                 |
+------------------------------------------+
```

### Alteracoes na tabela de clientes

- Novo botao com icone de "Handshake" ou "Users" na coluna de acoes
- Badge na tabela indicando quantidade de coprodutores ativos

---

## Parte 3: Dashboard do Coprodutor

Quando um usuario coprodutor acessa o Dashboard de um cliente onde ele e coprodutor, um card adicional aparece mostrando:

- **Minha Coprodução**: Valor total que o coprodutor ganha no periodo selecionado
- Breakdown por produto com porcentagem e valor calculado
- Calculo: para cada transacao do cliente no periodo, multiplicar o valor da venda pela porcentagem do coprodutor para aquele produto

### Logica de calculo

1. Buscar todos os registros de `coproducer_product_rates` do usuario logado para o cliente ativo
2. Buscar transacoes do periodo agrupadas por produto
3. Para cada produto, multiplicar o total pela taxa do coprodutor
4. Somar tudo para o total de coprodução

---

## Detalhes Tecnicos

### Arquivos novos

- `src/components/clients/ClientCoproducersDialog.tsx` - Dialog de gestao de coprodutores
- `src/hooks/useCoproducers.ts` - CRUD de coprodutores e taxas por produto
- `src/components/dashboard/CoproducerEarningsCard.tsx` - Card de ganhos no dashboard

### Arquivos editados

- `src/pages/Clients.tsx` - Adicionar botao e dialog de coprodutores
- `src/components/clients/ClientsTable.tsx` - Adicionar coluna/botao de coprodutores
- `src/pages/Dashboard.tsx` - Renderizar card de coprodução quando usuario for coprodutor

### Migracao SQL

```sql
-- Tabela de coprodutores
CREATE TABLE client_coproducers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

ALTER TABLE client_coproducers ENABLE ROW LEVEL SECURITY;

-- Tabela de taxas por produto
CREATE TABLE coproducer_product_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coproducer_id uuid NOT NULL REFERENCES client_coproducers(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  rate_percent numeric NOT NULL CHECK (rate_percent > 0 AND rate_percent <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coproducer_id, product_name)
);

ALTER TABLE coproducer_product_rates ENABLE ROW LEVEL SECURITY;

-- RLS: Masters gerenciam tudo
CREATE POLICY "Masters can manage coproducers"
  ON client_coproducers FOR ALL
  USING (has_role(auth.uid(), 'master'));

CREATE POLICY "Users can view own coproducer records"
  ON client_coproducers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Masters can manage rates"
  ON coproducer_product_rates FOR ALL
  USING (has_role(auth.uid(), 'master'));

CREATE POLICY "Users can view rates of own coproductions"
  ON coproducer_product_rates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_coproducers
    WHERE client_coproducers.id = coproducer_product_rates.coproducer_id
    AND client_coproducers.user_id = auth.uid()
  ));
```

### Hook `useCoproducers`

- `useCoproducers(clientId)` - Lista coprodutores de um cliente com suas taxas
- `useAddCoproducer()` - Mutation para adicionar coprodutor
- `useRemoveCoproducer()` - Mutation para remover
- `useToggleCoproducer()` - Ativar/desativar
- `useSetProductRate()` - Definir/atualizar porcentagem de um produto
- `useRemoveProductRate()` - Remover taxa de um produto
- `useMyCoproduction(clientId)` - Para o usuario logado, busca suas taxas e calcula ganhos

### Hook para Dashboard

O `useMyCoproduction(clientId)` faz:
1. Verifica se o usuario logado e coprodutor do cliente
2. Busca as taxas por produto
3. Busca totais de vendas por produto do cliente no periodo
4. Calcula o valor de coprodução por produto e total

