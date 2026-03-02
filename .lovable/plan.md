

# Plano: Restaurar tooltip no card "Receita Projetada"

## Mudanças

### 1. `ExecutiveKPICard` — adicionar suporte a `tooltipContent`
**Arquivo:** `src/components/dashboard/ExecutiveKPICard.tsx`

- Adicionar prop `tooltipContent?: React.ReactNode` à interface
- Importar `Tooltip`, `TooltipTrigger`, `TooltipContent` de `@/components/ui/tooltip`
- Quando `tooltipContent` existir, envolver o card em `Tooltip` (igual ao padrão do `ColoredKPICard`)
- Adicionar `cursor-help` quando tooltip existir

### 2. `Dashboard.tsx` — passar tooltip com composição do valor
**Arquivo:** `src/pages/Dashboard.tsx`

- No card "Receita Projetada", passar `tooltipContent` com a composição:
  - **Já processado:** `revenue.confirmed` (hotmart real + tmb + eduzz + USD convertido)
  - **A receber (recorrências):** diferença entre projetado e confirmado (`revenue.projected - revenue.confirmed`), exibido em amarelo se > 0
  - **USD convertido:** valor em BRL da conversão USD, exibido em azul se > 0
  - Footer explicativo: "Soma dos valores já processados + parcelas futuras de transações parceladas."

Isso restaura o tooltip com o mesmo layout visual que existia antes (conforme o print de referência).

