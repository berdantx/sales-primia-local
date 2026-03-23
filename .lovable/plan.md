

# Correção da Cotação do Dólar

## Problema

A edge function `get-dollar-rate` está sempre caindo no fallback estático de R$ 6,10 porque:
- **AwesomeAPI**: retorna 429 (rate limit excedido)
- **BCB (Banco Central)**: retorna 503 (serviço indisponível)

O valor fixo de R$ 6,10 pode estar desatualizado e não reflete a cotação real.

## Solução

Adicionar **mais fontes de cotação** e implementar **cache no banco** para reduzir chamadas às APIs.

### 1. Adicionar novas APIs de cotação (na edge function)

Expandir a cadeia de fallback com 2 APIs adicionais:
- **ExchangeRate API** (`open.er-api.com/v6/latest/USD`) — gratuita, sem autenticação
- **Frankfurter API** (`api.frankfurter.app/latest?from=USD&to=BRL`) — já usada no projeto para conversão de moedas exóticas

Ordem de tentativa: AwesomeAPI → BCB → ExchangeRate → Frankfurter → fallback estático

### 2. Cache da cotação no banco de dados

Criar uma tabela `dollar_rate_cache` para armazenar a última cotação obtida com sucesso:
- Campos: `rate`, `source`, `fetched_at`
- A edge function grava nessa tabela sempre que obtiver uma cotação real
- Se todas as APIs falharem, usa o último valor do cache (em vez do R$ 6,10 fixo)
- O fallback estático só é usado se o cache também estiver vazio

### 3. Atualizar o fallback estático

Atualizar o valor fixo para uma cotação mais próxima da realidade atual como última rede de segurança.

## Arquivos alterados

- `supabase/functions/get-dollar-rate/index.ts` — adicionar APIs e lógica de cache
- Nova migração SQL — criar tabela `dollar_rate_cache`

## Resultado esperado

- Cotação real na grande maioria dos casos (4 APIs disponíveis)
- Quando todas falharem, usa a última cotação válida do cache
- O indicador no header deixa de mostrar "fallback" e passa a exibir a fonte real

