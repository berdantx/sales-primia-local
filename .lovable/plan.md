
# Modal de Detalhes do Cliente - Top 10 Clientes

## O que muda
Ao clicar em um cliente na lista "Top 10 Clientes", uma modal sera aberta mostrando todas as compras daquele cliente no periodo selecionado, com detalhes de cada transacao.

## Mudancas

### 1. Novo componente: `src/components/dashboard/CustomerDetailDialog.tsx`
- Modal (Dialog) que recebe o email do cliente selecionado
- Busca transacoes do cliente nas 3 tabelas (transactions, tmb_transactions, eduzz_transactions) filtrando por `buyer_email`
- Exibe:
  - Cabecalho com nome, email, total gasto e quantidade de compras
  - Lista de transacoes em tabela com: data, produto, plataforma (badge), valor, status
  - Ordenadas por data (mais recente primeiro)
- Utiliza o Supabase client diretamente para buscar por email (sem necessidade de nova RPC)

### 2. Editar: `src/components/dashboard/TopCustomers.tsx`
- Adicionar estado para cliente selecionado
- Tornar cada linha clicavel (cursor pointer, hover effect)
- Renderizar o `CustomerDetailDialog` passando o cliente selecionado
- Receber os filtros de periodo (startDate, endDate) e clientId como props para repassar ao dialog

### 3. Editar: `src/pages/Dashboard.tsx`
- Passar `filters` e `clientId` como props adicionais para o componente `TopCustomers`

## Detalhes Tecnicos

### CustomerDetailDialog
- Usa `useQuery` para buscar transacoes quando o dialog abre
- 3 queries paralelas (uma por plataforma) filtradas por `buyer_email` e periodo
- Unifica os resultados em uma lista ordenada por data
- Mostra badge colorido por plataforma (Hotmart verde, TMB azul, Eduzz roxo)
- ScrollArea para listas longas
- Loading skeleton enquanto carrega

### TopCustomers (alteracoes)
- Nova interface de props incluindo `startDate`, `endDate`, `clientId`
- Estado `selectedCustomer` para controlar qual cliente esta aberto
- `onClick` em cada linha do cliente para abrir o dialog
- Estilo hover com `cursor-pointer` e `hover:bg-muted/50`

### Dashboard (alteracoes)
- Passar `filters.startDate`, `filters.endDate` e `clientId` para `TopCustomers`
