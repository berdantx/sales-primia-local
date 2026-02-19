

# Auditoria Completa para Remocao de Duplicatas

## Problema
Todas as remocoes de transacoes na pagina de Duplicatas acontecem sem pedir justificativa e sem registrar log de auditoria. Isso vale para as 3 plataformas (Hotmart, TMB e Eduzz) e para ambas as abas (por ID e por Email).

## Solucao

### 1. Criar tabela unificada de logs de exclusao de duplicatas
Uma nova tabela `duplicate_deletion_logs` para registrar cada exclusao feita na pagina de auditoria, cobrindo todas as plataformas:

```text
duplicate_deletion_logs:
  - id (uuid, PK)
  - transaction_id (uuid) -- ID do registro excluido
  - platform (text) -- 'hotmart', 'tmb', 'eduzz'
  - transaction_identifier (text) -- transaction_code / order_id / sale_id
  - client_id (uuid)
  - deleted_by (uuid)
  - justification (text, NOT NULL)
  - transaction_data (jsonb) -- snapshot completo do registro
  - audit_type (text) -- 'id_duplicate' ou 'email_duplicate'
  - created_at (timestamptz)
```

Politicas RLS: master pode inserir e visualizar.

### 2. Criar dialog de justificativa reutilizavel
Novo componente `DuplicateDeletionDialog` que:
- Mostra resumo dos registros que serao excluidos (quantidade, plataforma, valor total)
- Exige campo de justificativa obrigatorio (textarea)
- Botoes Cancelar / Confirmar Exclusao

### 3. Alterar fluxo de resolucao nas duas abas

**Aba por ID** -- Botoes "Manter Webhook" e "Manter CSV" (individual e lote):
- Em vez de excluir imediatamente, abrem o dialog de justificativa
- So apos preenchimento e confirmacao, executam a exclusao + log

**Aba por Email** -- Botoes "Manter Mais Recente", "Manter Webhook", "Manter CSV", "Remover Selecionados":
- Mesmo comportamento: abrem dialog, exigem justificativa, depois executam

### 4. Atualizar hooks de resolucao
Alterar `useResolveDuplicate` e `useResolveEmailDuplicate` para:
1. Buscar os dados completos dos registros antes de excluir
2. Inserir logs na tabela `duplicate_deletion_logs` com snapshot + justificativa
3. Somente depois, deletar os registros

---

## Secao tecnica

### Arquivos a criar
| Arquivo | Descricao |
|---|---|
| `src/components/audit/DuplicateDeletionDialog.tsx` | Dialog reutilizavel com campo de justificativa |

### Arquivos a modificar
| Arquivo | Mudanca |
|---|---|
| `src/hooks/useDuplicateAudit.ts` | `useResolveDuplicate` e `useResolveEmailDuplicate` passam a receber justificativa, buscar dados, inserir logs antes de deletar |
| `src/pages/DuplicateAudit.tsx` | Botoes de resolucao abrem o dialog em vez de executar diretamente |

### Migracao SQL
- Criar tabela `duplicate_deletion_logs` com RLS para master
- Sem foreign keys para tabelas de transacoes (o registro ja foi excluido quando o log e consultado)

