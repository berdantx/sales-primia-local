

# Diferenciação dos KPI Cards: Ícone + Acento Lateral

## Abordagem

Adicionar a cada card um **acento lateral colorido** (borda esquerda de 3px) e um **ícone contextual discreto**, mantendo o minimalismo premium.

### Mapeamento por card

| Card | Ícone | Cor do acento |
|------|-------|---------------|
| Receita Confirmada | `DollarSign` | Emerald (`border-l-emerald-400`) |
| Receita Projetada | `TrendingUp` | Blue (`border-l-blue-400`) |
| Meta do Período | `Target` | Amber (`border-l-amber-400`) |
| Leads no Período | `Users` | Violet (`border-l-violet-400`) |

### Alterações

**1. `ExecutiveKPICard.tsx`**
- Adicionar props opcionais: `icon?: LucideIcon` e `accentColor?: string`
- Renderizar ícone no canto superior direito dentro de um circle sutil (`p-2 rounded-xl bg-{color}/10`)
- Aplicar `border-l-[3px]` com a cor de acento no container principal
- Ícone com `h-4 w-4`, stroke 1.75, cor correspondente ao acento

**2. `Dashboard.tsx`**
- Passar `icon` e `accentColor` para cada um dos 4 `ExecutiveKPICard`
- Importar `DollarSign, TrendingUp, Target, Users` do lucide-react

### Resultado visual
Cards mantêm fundo branco, sombra sutil e `rounded-2xl`. A diferenciação vem exclusivamente da linha lateral colorida + ícone contextual — sem fundos coloridos, sem gradientes.

