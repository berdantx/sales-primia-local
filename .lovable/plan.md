
# Plano: Adicionar "Último Dia" nos Filtros de Período

## Objetivo
Adicionar a opção "Último dia" nos seletores de período tanto na página de **Faturamento (Dashboard)** quanto na página de **Leads**, facilitando a visualização rápida dos dados do dia anterior.

## Alterações Necessárias

### 1. Dashboard (Faturamento)
**Arquivo:** `src/pages/Dashboard.tsx`

- Adicionar `'1d'` ao tipo `PeriodFilter` (linha 56)
- Adicionar novo `SelectItem` com valor "1d" e label "Último dia" no dropdown de período (antes de "Últimos 7 dias")
- Atualizar a lógica de cálculo de datas para incluir o período de 1 dia

### 2. Filtro de Período de Leads
**Arquivo:** `src/components/leads/LeadsPeriodFilter.tsx`

- Adicionar nova opção `{ value: '1day', label: 'Último dia' }` no array `periodOptions`
- Adicionar case `'1day'` na função `handlePeriodChange` que define `dateRange` como ontem até hoje

---

## Detalhes Técnicos

### Dashboard - Tipo PeriodFilter atualizado:
```typescript
type PeriodFilter = '1d' | '7d' | '30d' | '90d' | '365d' | 'all' | 'custom';
```

### Dashboard - Nova opção no Select:
```tsx
<SelectItem value="1d">Último dia</SelectItem>  // Primeira opção
<SelectItem value="7d">Últimos 7 dias</SelectItem>
// ... demais opções
```

### LeadsPeriodFilter - Array periodOptions atualizado:
```typescript
const periodOptions = [
  { value: '1day', label: 'Último dia' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '60days', label: 'Últimos 60 dias' },
  { value: 'all', label: 'Todo período' },
  { value: 'custom', label: 'Personalizado' },
];
```

### LeadsPeriodFilter - Lógica de data para 1 dia:
```typescript
case '1day':
  onDateRangeChange({ from: subDays(now, 1), to: now });
  break;
```

---

## Arquivos Modificados
1. `src/pages/Dashboard.tsx`
2. `src/components/leads/LeadsPeriodFilter.tsx`

## Resultado Esperado
Após a implementação, os usuários terão a opção "Último dia" como primeira escolha nos filtros de período, permitindo visualização rápida dos dados das últimas 24 horas tanto em Faturamento quanto em Leads.
