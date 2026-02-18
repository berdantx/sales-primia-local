
# Estrategia de Analise de Duplicatas por Email

## Problema
A auditoria atual agrupa duplicatas apenas pelo ID da transacao (`sale_id`, `transaction_code`, `order_id`). Porem, existem vendas com IDs diferentes para o mesmo email + produto que representam compras canceladas nao processadas ou duplicacoes reais. Exemplo: `bbellie@icloud.com` tem 2 transacoes Eduzz distintas para "CIS Online" com `sale_id`s diferentes.

Na Hotmart, muitas dessas "duplicatas por email" sao parcelas legitimas (tratadas pelo Recuperador Inteligente), entao precisam de tratamento diferente.

## Solucao

Adicionar uma **segunda aba** na pagina de Auditoria de Duplicatas: "Por Email", que agrupa transacoes pelo par `(buyer_email, product, client_id)` em vez de pelo ID da transacao.

### Funcionalidades da nova aba

1. **Cards de resumo** mostrando quantos grupos de email duplicado existem por plataforma e o valor total potencialmente inflado
2. **Tabela expandivel** com cada grupo mostrando:
   - Email, produto, cliente
   - Todas as transacoes do grupo com sale_id, valor, data, fonte e status
   - Valor total do grupo vs. valor unitario
3. **Acoes por grupo**:
   - "Manter mais recente" (deleta os mais antigos)
   - "Manter webhook" / "Manter CSV" (quando ha fontes mistas)
   - "Selecionar manualmente" quais manter/remover via checkbox
4. **Filtros**:
   - Por plataforma (Hotmart/TMB/Eduzz)
   - Por cliente
   - Apenas com fontes mistas (webhook vs CSV)
   - Excluir parcelas Hotmart (billing_type = recurrence)

### Diferenciacao de parcelas vs duplicatas reais (Hotmart)
Para a Hotmart, transacoes com `recurrence_number > 1` ou `billing_type` de recorrencia serao marcadas como "provavelmente parcelas" e exibidas com um badge informativo, podendo ser filtradas para fora.

## Detalhes tecnicos

### Arquivos modificados

**`src/hooks/useDuplicateAudit.ts`**
- Adicionar novo hook `useEmailDuplicateAudit` que:
  - Busca as 3 tabelas (mesmas queries, mas incluindo `status`, `billing_type`, `recurrence_number` para Hotmart)
  - Agrupa por `(buyer_email, product, client_id)` em vez de pelo ID
  - Calcula valor inflado como `soma_total - valor_maior_transacao`
  - Marca grupos Hotmart com recorrencia como "parcelas"
- Adicionar interface `EmailDuplicateGroup` com campo extra `isProbablyInstallments`

**`src/pages/DuplicateAudit.tsx`**
- Adicionar `Tabs` (shadcn) com duas abas: "Por ID" (atual) e "Por Email" (nova)
- A aba "Por Email" reutiliza a mesma estrutura visual mas com os dados do novo hook
- Adicionar filtros inline: plataforma, cliente, "ocultar parcelas"
- Adicionar acoes de resolucao manual (checkbox por registro dentro do grupo)

**`src/hooks/useDuplicateAudit.ts`** (mutation)
- Adicionar `useResolveEmailDuplicate` que recebe IDs especificos para deletar (selecionados manualmente pelo usuario)

### Fluxo da busca por email

```text
1. Buscar todas transacoes das 3 tabelas
2. Agrupar por (email_normalizado, produto, client_id)
3. Filtrar grupos com count > 1
4. Para Hotmart: marcar como "parcelas" se recurrence_number varia
5. Calcular valor inflado = soma - max(valor)
6. Ordenar por valor inflado desc
```

### Nenhuma migracao necessaria
Todas as colunas ja existem nas tabelas. A logica e inteiramente frontend.
