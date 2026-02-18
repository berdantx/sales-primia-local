

# Filtrar Duplicatas por Cliente Selecionado

## Problema atual
Os hooks `useDuplicateAudit` e `useEmailDuplicateAudit` buscam **todas** as transacoes de **todos** os clientes sem filtrar pelo cliente selecionado no contexto global. Isso faz com que as abas "Por ID" e "Por Email" misturem dados de clientes diferentes.

## O que muda
Atualizar os dois hooks para receber o `clientId` do contexto global e filtrar as queries no banco. A pagina `DuplicateAudit.tsx` vai passar o `clientId` do `useFilter()` para os hooks.

## Detalhes tecnicos

### 1. Arquivo: `src/hooks/useDuplicateAudit.ts`

**`useDuplicateAudit(clientId)`**:
- Adicionar parametro `clientId: string | null`
- Incluir `clientId` na `queryKey`: `['duplicate-audit', clientId]`
- Adicionar `.eq('client_id', clientId)` em cada query (quando clientId existir)
- Desabilitar a query quando `clientId` for null (para usuarios que precisam selecionar cliente): `enabled: !!clientId`

**`useEmailDuplicateAudit(clientId)`**:
- Mesmo tratamento: parametro `clientId`, queryKey com clientId, filtro `.eq('client_id', clientId)`, enabled condicional

### 2. Arquivo: `src/pages/DuplicateAudit.tsx`

- Importar `useFilter` de `@/contexts/FilterContext`
- Extrair `clientId` do contexto
- Passar `clientId` para `IdDuplicatesTab` e `EmailDuplicatesTab` como prop
- Dentro de cada tab, passar `clientId` para os hooks `useDuplicateAudit(clientId)` e `useEmailDuplicateAudit(clientId)`

### Resultado esperado
- Cliente "Camila Vieira - 2026" selecionado: somente duplicatas desse cliente aparecem
- Cliente "Paulo Vieira" selecionado: somente duplicatas dele aparecem
- Para usuarios master sem cliente selecionado: a busca fica desabilitada ate selecionar um cliente (ou alternativamente busca todos, conforme preferencia)

