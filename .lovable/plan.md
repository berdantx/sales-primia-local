

# Correcao de conversao de moedas exoticas + Filtro de pais no dashboard

## Problema identificado
A transacao `ksuaact61mkvrxqi9e99ap2uq` chegou em **DOP (Peso Dominicano)** com valor 12.260,21. O conversor de moedas nao tem DOP na lista de fallback e a API Frankfurter nao suporta DOP, entao o sistema gravou o valor original (12.260,21) como USD sem converter. O valor correto seria aproximadamente **~$203 USD** (taxa DOP/USD ~ 0.0166).

## Solucao em 3 partes

### Parte 1: Corrigir o conversor de moedas

**Arquivo:** `supabase/functions/_shared/currency-converter.ts`

- Adicionar DOP e outras moedas latino-americanas/caribenhas comuns ao mapa de fallback:
  - `DOP: 0.0166` (Peso Dominicano)
  - `GTQ: 0.129` (Quetzal Guatemalteco)
  - `HNL: 0.040` (Lempira Hondurenha)
  - `NIO: 0.027` (Cordoba Nicaraguense)
  - `PAB: 1.00` (Balboa Panamenho, atrelado ao USD)
  - `PYG: 0.00013` (Guarani Paraguaio)
  - `CRC: 0.0019` (Colon Costarriquenho)
- Adicionar API alternativa como segundo fallback (ExchangeRate API ou similar) antes de cair no fallback estatico
- **CRITICO**: Mudar o comportamento de "moeda desconhecida" - em vez de gravar o valor como-esta com USD, logar um erro e marcar a transacao com `currency: 'UNKNOWN'` para que nao polua os KPIs

### Parte 2: Corrigir a transacao existente no banco

- Atualizar a transacao DOP para o valor correto convertido:
  - `sale_value`: ~203.72 USD (12260.21 * 0.0166)
  - Manter `original_currency: 'DOP'` e `original_value: 12260.2099`

### Parte 3: Adicionar alerta visual para moedas nao-padrao

**Arquivo:** `src/components/eduzz/EduzzTransactionCard.tsx` (ou componente de listagem)

- Adicionar um badge/indicador visual quando `original_currency` nao for nulo, mostrando a moeda original e o valor convertido
- Exemplo: badge "DOP -> USD" ao lado do valor, permitindo ao usuario identificar rapidamente transacoes convertidas

### Parte 4: Filtro por moeda na pagina de transacoes Eduzz

**Arquivo:** `src/pages/EduzzTransactions.tsx` e filtros relacionados

- Adicionar filtro dropdown de moeda (BRL, USD, moedas convertidas) para que o usuario possa isolar transacoes por tipo de moeda
- Permitir ver apenas transacoes com conversao aplicada (onde `original_currency IS NOT NULL`)

## Detalhes Tecnicos

### Conversor atualizado (`currency-converter.ts`)

Novo mapa de fallback com moedas adicionais:
```text
DOP: 0.0166    // Peso Dominicano
GTQ: 0.129     // Quetzal Guatemalteco
HNL: 0.040     // Lempira Hondurenha
NIO: 0.027     // Cordoba Nicaraguense
PAB: 1.00      // Balboa Panamenho
PYG: 0.00013   // Guarani Paraguaio
CRC: 0.0019    // Colon Costarriquenho
```

Mudanca no fallback final (linha 69-70 atual):
- Antes: retorna valor original como USD (causa erro silencioso)
- Depois: retorna valor original mas marca `currency` como `'UNKNOWN_<moeda>'` e loga alerta

### Correcao de dados via SQL
```text
UPDATE eduzz_transactions
SET sale_value = ROUND(12260.2099 * 0.0166, 2)
WHERE sale_id = 'ksuaact61mkvrxqi9e99ap2uq'
```

### Webhooks Eduzz e Hotmart
Os mesmos ajustes no conversor beneficiam ambos os webhooks, pois ambos importam de `_shared/currency-converter.ts`.

### Impacto nos KPIs
Apos a correcao, o faturamento USD do dashboard sera reduzido em ~$12.057 (diferenca entre o valor errado 12.260 e o correto ~203), corrigindo o "furo no caixa".

