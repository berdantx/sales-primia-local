
Objetivo: fazer o relatório de vendas da TMB trazer os números de telefone de forma consistente (novos dados + histórico possível).

Diagnóstico confirmado:
- O exportador já renderiza a coluna `Telefone` na TMB.
- O problema está na origem dos dados da TMB: a maior parte dos registros chega com `buyer_phone` vazio.
- Foram identificadas duas causas:
  1) Importação por arquivo TMB não mapeia/salva telefone.
  2) Webhook TMB recebe telefone em chaves como `telefone_ativo`/`telefones`, mas a função atual não usa essas chaves.

Plano de implementação:

1) Corrigir captura de telefone na importação TMB (arquivo CSV)
- Arquivo: `src/lib/parsers/tmbParser.ts`
  - Adicionar `buyer_phone` na interface `TmbTransaction`.
  - Incluir mapeamento de coluna para telefone (`buyerPhone`) com aliases comuns (`telefone`, `celular`, `phone`, `telefones`, `telefone_ativo`, etc.).
  - Popular `buyer_phone` no `parseTmbData`.
- Arquivo: `src/components/upload/ColumnMappingStep.tsx`
  - Incluir campo opcional `buyerPhone` nas definições `TMB_FIELD_DEFINITIONS` para permitir mapeamento manual.
- Arquivo: `src/hooks/useImportTransactions.ts`
  - Em `importTmb`, incluir `buyer_phone: t.buyer_phone || null` no insert de `tmb_transactions`.
- (Opcional UX) Arquivo: `src/components/upload/TmbImportPreview.tsx`
  - Exibir coluna de telefone no preview para validar antes de importar.

2) Corrigir captura de telefone no webhook TMB
- Arquivo: `supabase/functions/tmb-webhook/index.ts`
  - Expandir payload tipado para campos de telefone realmente recebidos.
  - Criar extração robusta do telefone (prioridade: `telefone_ativo`, `telefones`, `telefone`, `phone`, `celular`).
  - Gravar o valor extraído em `buyer_phone` tanto no fluxo de efetivado quanto de cancelado/upsert.

3) Backfill dos dados históricos já existentes (sem alterar schema/RLS)
- Criar migração SQL de dados para atualizar `tmb_transactions.buyer_phone` onde está vazio, usando os logs de webhook mais recentes por `order_id` (e `client_id` quando aplicável).
- Regra: preencher somente quando `buyer_phone` atual estiver vazio, evitando sobrescrever dados existentes.

4) Estratégia para registros antigos importados por arquivo
- Como histórico de planilha não guarda todas as linhas originais no banco, parte dos importados sem telefone só será recuperada via reimportação.
- Após corrigir parser/import, reimportar planilha TMB usando opção de mesclar duplicadas para preencher campos vazios (inclusive telefone) sem duplicar vendas.

Validação pós-implementação:
- Query de conferência: contagem de TMB com telefone antes/depois.
- Teste funcional: importar um CSV TMB com coluna de telefone e validar persistência.
- Teste webhook: simular payload com `telefone_ativo`/`telefones` e validar persistência.
- Exportar relatório de vendas (TMB e consolidado) e confirmar números aparecendo na coluna `Telefone`.

Detalhes técnicos (resumo):
- Não exige novas tabelas nem mudança de permissões.
- Escopo principal: parser TMB, fluxo de importação TMB, webhook TMB e migração de backfill.
- Resultado esperado: telefone passa a aparecer no relatório para novos registros e para histórico recuperável via logs.
