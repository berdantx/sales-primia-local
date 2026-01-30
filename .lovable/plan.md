
# Plano: Dialog de Exportação com Filtro de Período

## O Que Será Implementado

Criar um componente dialog que aparece quando o usuário clica em "Exportar CSV", permitindo selecionar o período antes de iniciar a exportação.

## Comportamento Atual vs Novo

| Atual | Novo |
|-------|------|
| Clica em "Exportar CSV" → exporta com filtros da página | Clica em "Exportar CSV" → abre dialog → escolhe período → exporta |
| Usa apenas o período já selecionado na página | Pode escolher período diferente só para exportação |

## Interface do Dialog

O dialog terá:
- Seletor de período pré-definido (Últimos 7 dias, 30 dias, 90 dias, etc.)
- Calendário para período personalizado
- Opção de exportar todos ou sem testes
- Resumo mostrando período selecionado
- Botões Cancelar e Exportar

```text
┌─────────────────────────────────────────────┐
│  Exportar Leads                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  📅 Período                                 │
│  ┌─────────────────────────────────────┐   │
│  │ Últimos 30 dias                  ▼  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Se "Personalizado" selecionado:]          │
│  ┌─────────────────────────────────────┐   │
│  │ 📅 01/01/2026 - 30/01/2026          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ☐ Excluir leads de teste                   │
│                                             │
│  ─────────────────────────────────────────  │
│  📊 Resumo:                                 │
│  Período: 01/01/2026 - 30/01/2026           │
│  Cliente: Paulo Vieira                       │
│  ─────────────────────────────────────────  │
│                                             │
│            [Cancelar]  [Exportar Leads]     │
└─────────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/leads/ExportLeadsDialog.tsx` | **Criar** | Dialog com filtros de exportação |
| `src/pages/Leads.tsx` | Modificar | Substituir dropdown por dialog |

## Detalhes Técnicos

### Novo Componente: ExportLeadsDialog

```typescript
// Props do componente
interface ExportLeadsDialogProps {
  trigger?: React.ReactNode;
  defaultClientId?: string | null;
  defaultDateRange?: DateRange;
}

// Estados internos
const [period, setPeriod] = useState<PeriodOption>('30days');
const [customDateRange, setCustomDateRange] = useState<DateRange>();
const [excludeTests, setExcludeTests] = useState(false);
```

### Opções de Período

```typescript
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: '1day', label: 'Último dia' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '90days', label: 'Últimos 90 dias' },
  { value: '1year', label: 'Último ano' },
  { value: 'custom', label: 'Personalizado' },
];
```

### Modificação em Leads.tsx

O botão atual:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Exportar CSV</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Exportar todos</DropdownMenuItem>
    <DropdownMenuItem>Apenas reais</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Será substituído por:
```tsx
<ExportLeadsDialog
  defaultClientId={clientId}
  defaultDateRange={dateRange}
/>
```

## Fluxo do Usuário

1. Clica no botão "Exportar CSV"
2. Dialog abre com período padrão (últimos 30 dias)
3. Pode alterar para outro período pré-definido ou personalizado
4. Marca ou desmarca "Excluir leads de teste"
5. Vê resumo do que será exportado
6. Clica em "Exportar Leads"
7. Dialog fecha, toast confirma início da exportação
8. Notificação aparece quando pronto

## Reaproveitamento de Código

O componente usará:
- `useExportJobs` - hook existente para iniciar exportação
- `useFilter` - para obter cliente selecionado
- Padrões do `ExportReportDialog` existente (para transações)
- Componentes UI: Dialog, Select, Calendar, Checkbox, Button
