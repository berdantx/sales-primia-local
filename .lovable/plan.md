

# Correção da transação Eduzz 97139146 - Falha na conversão DOP para USD

## Problema identificado

A transação `97139146` foi recebida com valor em **DOP (Peso Dominicano)** mas a conversão para USD falhou silenciosamente no momento do processamento pelo webhook. O resultado:

- **Valor salvo:** 12.260,21 USD (errado)
- **Valor original:** 12.260,21 DOP
- **Valor correto:** ~203,52 USD (usando taxa DOP 0.0166)

O sistema possui a taxa de fallback para DOP (0.0166) no conversor de moedas, mas no momento da ingestão deste webhook, a conversão provavelmente falhou nas APIs externas (Frankfurter e ExchangeRate) e caiu no caso final da funcao `convertToUSD` que retorna o valor original sem conversao quando nenhuma taxa esta disponivel (linha 95 do conversor).

## Solucao

### 1. Corrigir o valor desta transacao no banco

Executar um UPDATE simples recalculando o valor com a taxa de fallback DOP (0.0166):

```sql
UPDATE eduzz_transactions
SET sale_value = ROUND(12260.21 * 0.0166, 2)
WHERE sale_id = '97139146';
```

Resultado esperado: `sale_value` passa de 12.260,21 para **203,52 USD**.

### 2. Melhorar o conversor de moedas para evitar recorrencia

Ajustar `supabase/functions/_shared/currency-converter.ts` para que, quando todas as APIs falham, o fallback com taxas estaticas seja tentado **antes** de retornar o valor sem conversao. Atualmente, o fallback estatico so funciona quando a API Frankfurter falha, mas se a moeda nao e suportada pela Frankfurter e a ExchangeRate tambem falha, o codigo pula o fallback estatico e retorna o valor cru.

**Correcao:** mover a verificacao de `FALLBACK_RATES_TO_USD` para **depois** de todas as tentativas de API, garantindo que sempre sera usado como ultima opcao antes de retornar sem conversao.

Na verdade, revisando o codigo, o fluxo atual ja e:
1. Tenta Frankfurter
2. Usa fallback estatico se disponivel
3. Tenta ExchangeRate API
4. Retorna sem conversao

O fallback estatico (passo 2) ja cobre DOP. Entao o problema foi provavelmente um caso raro onde a Frankfurter retornou OK mas sem a taxa DOP, e o fallback nao foi acionado corretamente. Para prevenir isso, podemos adicionar um log de alerta quando o valor retornado e igual ao original (indicando falha de conversao).

## Detalhes tecnicos

### Arquivo editado
- `supabase/functions/_shared/currency-converter.ts` - Adicionar validacao extra e log de alerta

### Operacao de banco
- UPDATE simples em 1 registro: `eduzz_transactions` onde `sale_id = '97139146'`

