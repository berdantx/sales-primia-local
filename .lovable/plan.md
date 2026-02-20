
# Painel de Coprodução para Master: Seletor de Coprodutor

## Resumo

Quando o usuario logado tiver role `master`, a pagina `/coproduction` deixa de mostrar apenas as coproducoes do proprio usuario e passa a listar **todos os coprodutores do sistema**, com um seletor (dropdown) para escolher qual coprodutor visualizar. Isso permite ao master acompanhar as comissoes de qualquer coprodutor.

---

## Comportamento

- **Usuario master**: Ve um dropdown no topo da pagina com todos os coprodutores cadastrados. Ao selecionar um, a pagina exibe as comissoes daquele coprodutor (mesma tabela por cliente/produto/plataforma que ja existe).
- **Usuario comum (coprodutor)**: Comportamento atual permanece inalterado -- ve apenas suas proprias coproducoes.

---

## Layout (apenas para master)

```text
+------------------------------------------------------+
| Coproducoes                                           |
| Visualize comissoes por coprodutor                    |
+------------------------------------------------------+
| Coprodutor: [v Bruno Vaz (berdantx@gmail.com)   ]    |
+------------------------------------------------------+
| Periodo: [1d | 7d | 30d | 90d | 1 ano | Tudo]       |
+------------------------------------------------------+
| [KPI Total] ...                                       |
| [Tabelas por cliente/produto] ...                     |
+------------------------------------------------------+
```

---

## Detalhes Tecnicos

### Novo hook: `useAllCoproducers()`

Busca todos os coprodutores ativos do sistema (apenas para masters). Retorna lista com `userId`, `userName`, `userEmail` para popular o dropdown.

Query: busca `client_coproducers` (todos, sem filtro de user_id) + join com `profiles` para nomes. Agrupado por `user_id` para evitar duplicatas (um usuario pode ser coprodutor de varios clientes).

RLS ja permite isso: masters tem policy `FOR ALL` na tabela `client_coproducers`.

### Novo hook: `useAllCoproductionsForUser(userId)`

Variante do `useMyCoproductions` existente, mas recebe um `userId` como parametro em vez de usar o usuario logado. Busca coproducoes de qualquer usuario (para uso pelo master).

### Alteracoes em `src/pages/Coproduction.tsx`

1. Importar `useUserRole` para detectar se e master
2. Se master: renderizar um `Select` (dropdown) com os coprodutores disponveis
3. Estado `selectedUserId`: quando master, usa o coprodutor selecionado no dropdown; quando usuario comum, usa `user.id`
4. Passar `selectedUserId` para os hooks de coproducao
5. Titulo e descricao adaptados: "Coproducoes" (sem "Minhas") quando master

### Alteracoes em `src/hooks/useCoproducerCommissions.ts`

1. Adicionar `useAllCoproducers()` -- lista todos os coprodutores distintos (user_id + nome + email)
2. Adicionar `useAllCoproductionsForUser(userId)` -- igual a `useMyCoproductions` mas sem depender de `auth.uid()`

### Arquivos editados

- `src/pages/Coproduction.tsx` -- Adicionar seletor de coprodutor e logica condicional por role
- `src/hooks/useCoproducerCommissions.ts` -- Adicionar hooks `useAllCoproducers` e `useAllCoproductionsForUser`
