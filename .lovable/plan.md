

# Backfill de Telefones TMB via Webhook Logs

## Diagnóstico

Os dados confirmam que os webhooks TMB **já trazem o telefone** (campo `telefone_ativo` / `telefones`). O backfill anterior já recuperou a maioria dos registros possíveis:

- **Total TMB**: 2.845 transações
- **Com telefone**: 1.367 (48%)
- **Sem telefone e com log de webhook disponível**: apenas **7** restantes
- **Sem telefone e sem log**: ~1.471 (vieram de importação CSV sem telefone)

## Plano

### 1. Executar backfill dos 7 registros restantes
Migração SQL simples para atualizar os 7 registros que ainda têm payload no webhook_logs mas não foram preenchidos.

### 2. Registros sem webhook log (~1.471)
Esses vieram de importação por CSV. Só podem ser recuperados de duas formas:
- **Reimportar** a planilha TMB original (agora que o parser já captura telefone)
- Ou aceitar que esses registros antigos ficarão sem telefone

Nenhuma outra fonte de dados existe para eles no sistema.

## Resumo técnico
- 1 migração SQL para backfill dos 7 registros pendentes
- Para os demais ~1.471, orientação para reimportar planilha TMB com a opção de mesclar campos vazios

