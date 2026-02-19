
# Adicionar "Ver Webhook Completo" no Detalhe da Transacao Eduzz

## Problema
Ao clicar em uma transacao Eduzz na tela de Auditoria de Duplicatas, o dialog de detalhes nao oferece a opcao de visualizar o payload completo do webhook, dificultando a analise tecnica.

## Solucao
Adicionar um botao "Ver webhook completo" no `EduzzTransactionDetailDialog` que busca o payload do webhook na tabela `webhook_logs` usando o `sale_id` como `transaction_code`.

## Detalhes tecnicos

### Arquivo: `src/components/eduzz/EduzzTransactionDetailDialog.tsx`

1. Adicionar estado para controlar a exibicao do webhook (`showWebhook`) e para armazenar o payload carregado
2. Criar uma funcao que busca o webhook na tabela `webhook_logs` filtrando por `transaction_code = sale_id`
3. Adicionar uma nova `Card` ao final do `ScrollArea` com:
   - Botao "Ver webhook completo" (icone `Code`) que dispara a busca
   - Quando carregado, exibe o JSON formatado e higienizado (removendo campos internos como `user_id`, `client_id`) em um bloco `<pre>` com scroll
   - Botao "Copiar" para copiar o JSON para a area de transferencia
   - Indicador de loading enquanto busca
   - Mensagem caso nao haja webhook disponivel (ex: transacao importada via CSV)

### Padrao seguido
O mesmo padrao ja implementado em `CustomerDetailDialog.tsx` (linhas 166-184), que sanitiza o JSON e oferece toggle para exibir/ocultar.

### Nenhuma migracao necessaria
A tabela `webhook_logs` ja existe e possui a coluna `transaction_code` que armazena o `sale_id` das transacoes Eduzz.
