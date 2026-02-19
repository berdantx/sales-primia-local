

# Auditoria Completa: Justificativa Obrigatoria + Visibilidade nos Cancelamentos

## Problema
1. Exclusoes na pagina de Duplicatas acontecem sem justificativa e sem log de auditoria
2. Transacoes Eduzz excluidas via Duplicatas nao aparecem na pagina "Cancelamentos Eduzz" (aba Exclusoes Manuais)
3. Transacoes TMB excluidas via Duplicatas nao aparecem em nenhum lugar -- a pagina "Cancelamentos TMB" nao tem aba de exclusoes manuais

## Solucao

### 1. Criar tabela unificada de logs de exclusao de duplicatas
Tabela `duplicate_deletion_logs` para registrar cada exclusao feita na pagina de auditoria:

```text
duplicate_deletion_logs:
  - id (uuid, PK)
  - transaction_id (uuid)
  - platform (text) -- 'hotmart', 'tmb', 'eduzz'
  - transaction_identifier (text) -- transaction_code / order_id / sale_id
  - client_id (uuid)
  - deleted_by (uuid)
  - justification (text, NOT NULL)
  - transaction_data (jsonb)
  - audit_type (text) -- 'id_duplicate' ou 'email_duplicate'
  - created_at (timestamptz)
```

RLS: master pode inserir e visualizar.

### 2. Criar dialog de justificativa reutilizavel
Componente `DuplicateDeletionDialog` com:
- Resumo dos registros a excluir (quantidade, plataforma, valor)
- Campo de justificativa obrigatorio
- Botoes Cancelar / Confirmar

### 3. Atualizar hooks de resolucao
`useResolveDuplicate` e `useResolveEmailDuplicate`:
- Recebem justificativa como parametro
- Buscam dados completos antes de excluir
- Inserem logs em `duplicate_deletion_logs`
- **Para Eduzz:** tambem inserem na tabela `eduzz_transaction_deletion_logs` (para aparecer em Cancelamentos Eduzz)
- Depois deletam os registros

### 4. Integrar dialog na pagina DuplicateAudit
Todos os botoes de resolucao (Manter Webhook, Manter CSV, Manter Mais Recente, Remover Selecionados) abrem o dialog antes de executar.

### 5. Adicionar aba "Exclusoes Manuais" na pagina Cancelamentos TMB
Similar ao que ja existe em Cancelamentos Eduzz:
- Criar hook `useTmbDeletionLogs` que le de `duplicate_deletion_logs` filtrado por `platform = 'tmb'`
- Adicionar aba com tabela mostrando produto, cliente, valor, quem excluiu, justificativa e data
- Atualizar KPIs para incluir contagem de exclusoes manuais

### 6. Atualizar Cancelamentos Eduzz para ler tambem de `duplicate_deletion_logs`
A aba "Exclusoes Manuais" atualmente so le de `eduzz_transaction_deletion_logs`. Precisa tambem exibir exclusoes feitas via pagina de Duplicatas (da nova tabela `duplicate_deletion_logs` com `platform = 'eduzz'`).

---

## Secao tecnica

### Arquivos a criar
| Arquivo | Descricao |
|---|---|
| `src/components/audit/DuplicateDeletionDialog.tsx` | Dialog reutilizavel com justificativa |
| `src/hooks/useTmbDeletionLogs.ts` | Hook para ler logs de exclusao TMB |

### Arquivos a modificar
| Arquivo | Mudanca |
|---|---|
| `src/hooks/useDuplicateAudit.ts` | Hooks de resolucao passam a exigir justificativa, inserir logs antes de deletar, e para Eduzz inserir tambem em `eduzz_transaction_deletion_logs` |
| `src/pages/DuplicateAudit.tsx` | Botoes de resolucao abrem o dialog de justificativa |
| `src/pages/TmbCancellations.tsx` | Adicionar Tabs com aba "Exclusoes Manuais" + KPI de exclusoes |
| `src/hooks/useEduzzDeletionLogs.ts` | Tambem buscar registros de `duplicate_deletion_logs` com platform='eduzz' e mesclar |

### Migracao SQL
- Criar tabela `duplicate_deletion_logs` com RLS para master (inserir + visualizar)

