
# Corrigir Projeção de Faturamento menor que Faturamento Atual

## Problema
O card "Projeção Faturamento" (R$ 1.188.723,50) esta mostrando um valor menor que "Faturamento Atual" (R$ 1.227.716,09). Isso nao faz sentido logicamente, pois a projecao inclui recorrencias futuras e deveria ser sempre maior ou igual ao faturamento real.

## Causa Raiz
A projecao de faturamento e calculada usando uma funcao de banco de dados (`get_transaction_stats_with_projection`) que:
1. Soma `projected_value` apenas da tabela `transactions` (Hotmart), sem aplicar a mesma logica de deduplicacao "Recuperador Inteligente" usada no calculo de faturamento atual
2. O faturamento atual usa uma logica diferente de agregacao (com deduplicacao), o que pode resultar em valores ligeiramente diferentes

Essa discrepancia entre as duas formulas de calculo permite que a projecao fique abaixo do real em certos cenarios.

## Solucao
Aplicar uma regra simples de seguranca: **a projecao nunca pode ser menor que o faturamento atual**. Se o valor projetado calculado for inferior ao total vendido, usamos o total vendido como piso.

### Arquivo: `src/pages/Dashboard.tsx`

Na linha onde `projectionValueForGoal` e calculado (linha ~205), adicionar um `Math.max` para garantir que o valor de projecao nunca seja menor que `primaryGoalSales`:

```
projectionValueForGoal: Math.max(combinedProjectedBRL + usdConvertedToBRL, primaryGoalSales)
```

Como `primaryGoalSales` e calculado antes de `projectionValueForGoal`, sera necessario reestruturar levemente o `useMemo` para ter acesso a esse valor, ou incluir a mesma logica de calculo do total vendido dentro do memo de projecao.

### Detalhes tecnicos
- Mover o calculo de `primaryGoalSales` para antes do memo de projecao (ja esta assim)
- Adicionar `primaryGoalSales` como dependencia do `useMemo` de projecao
- Usar `Math.max(projectionCalculated, primaryGoalSales)` como valor final
- Nenhuma alteracao de banco de dados necessaria
