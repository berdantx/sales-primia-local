

# Botao de Busca de Duplicatas por Cliente

## O que muda
Adicionar um botao "Buscar Duplicata" na pagina de Auditoria de Duplicatas que abre um dialog de busca. Nesse dialog, o usuario digita um ID de transacao ou e-mail, escolhe a plataforma (Todas, Hotmart, TMB ou Eduzz), e o sistema faz uma busca direta no banco filtrando pelo cliente selecionado no contexto global.

## Como vai funcionar
1. O usuario clica no botao "Buscar Duplicata"
2. Um dialog abre com campo de busca (ID ou e-mail) e selector de plataforma
3. O sistema busca nas tabelas `transactions`, `tmb_transactions` e/ou `eduzz_transactions` filtrando por `client_id` do contexto global
4. Os resultados sao exibidos agrupados, mostrando todos os registros que compartilham o mesmo ID ou e-mail
5. O usuario pode clicar em qualquer resultado para abrir os detalhes (reutilizando a logica de `handleRowClick` ja existente)
6. O usuario pode resolver duplicatas diretamente nos resultados da busca

## Detalhes tecnicos

### Arquivo: `src/pages/DuplicateAudit.tsx`

1. **Remover as barras de busca inline** das duas abas (as `Input` com icone de `Search` que existem atualmente)

2. **Criar componente `SearchDuplicateDialog`**:
   - Props: `open`, `onOpenChange`
   - Estados internos: `searchTerm`, `platformFilter` (all/hotmart/tmb/eduzz), `results`, `isSearching`
   - Usa `useFilter()` do contexto global para obter o `clientId` selecionado
   - Ao clicar "Buscar", faz queries no Supabase:
     - Se `clientId` existe, filtra por `.eq('client_id', clientId)`
     - Busca por ID: `.ilike('transaction_code', '%termo%')` (hotmart), `.ilike('order_id', '%termo%')` (tmb), `.ilike('sale_id', '%termo%')` (eduzz)
     - Busca por email: `.ilike('buyer_email', '%termo%')` em cada tabela
   - Exibe os resultados em uma tabela dentro do dialog
   - Cada linha e clicavel e abre o dialog de detalhes da plataforma correspondente (Hotmart/Eduzz/TMB)

3. **Adicionar botao na pagina principal** (no header, ao lado do titulo):
   - Icone `Search` + texto "Buscar Duplicata"
   - Controla abertura do `SearchDuplicateDialog`

4. **Importacoes adicionais**:
   - `Dialog, DialogContent, DialogHeader, DialogTitle` de `@/components/ui/dialog`
   - `useFilter` de `@/contexts/FilterContext`

### Fluxo da busca

```text
[Botao "Buscar Duplicata"]
        |
        v
[Dialog abre]
  - Campo: ID ou Email
  - Plataforma: Todas | Hotmart | TMB | Eduzz  
  - Botao: Buscar
        |
        v
[Query no banco com client_id do contexto]
  - transactions WHERE (transaction_code ILIKE OR buyer_email ILIKE) AND client_id = X
  - tmb_transactions WHERE (order_id ILIKE OR buyer_email ILIKE) AND client_id = X
  - eduzz_transactions WHERE (sale_id ILIKE OR buyer_email ILIKE) AND client_id = X
        |
        v
[Resultados agrupados na tabela do dialog]
  - Plataforma | ID | Email | Nome | Valor | Data | Origem
  - Clique abre detalhes completos
```

### Nenhuma migracao necessaria
Reutiliza tabelas e dados existentes, apenas faz queries diretas com filtros.
