

# Melhorias no modal de detalhes do cliente

## Resumo
Duas melhorias no painel expandivel de detalhes da transacao:
1. Incluir o ID da transacao dentro da secao "Ver mais detalhes da compra"
2. Adicionar botao "Ver webhook completo" que mostra o JSON bruto completo da transacao

## O que muda

### Editar: `src/components/dashboard/CustomerDetailDialog.tsx`

**1. Adicionar ID da transacao nos detalhes expandidos**
- Incluir `transaction_code` (Hotmart), `order_id` (TMB), `sale_id` (Eduzz) nos respectivos mapas de labels
- Hotmart: `transaction_code` -> "ID da Transacao"
- TMB: `order_id` -> "ID do Pedido"
- Eduzz: `sale_id` -> "ID da Venda"

**2. Adicionar botao "Ver webhook completo"**
- Dentro da area expandida, apos o grid de detalhes resumidos, adicionar um botao "Ver webhook completo"
- Ao clicar, exibe um bloco `<pre>` com o JSON completo do `rawData` formatado com `JSON.stringify(rawData, null, 2)`
- Estado separado `showRawId: string | null` para controlar qual transacao mostra o JSON
- O JSON sera exibido em um bloco com fundo `bg-muted`, borda arredondada, scroll horizontal, e fonte mono pequena
- Botao com icone `Code` do lucide-react

### Estrutura visual da area expandida (por transacao)

```text
+--------------------------------------------+
| [ChevronUp] Ver mais detalhes da compra    |
|                                            |
| ID: ksuaact61mk...  Nome: Michelle...     |
| Email: ...           Telefone: ...         |
| Produto ID: ...      Valor Original: ...   |
| Fonte: webhook                             |
|                                            |
| [Code] Ver webhook completo                |
| +----------------------------------------+ |
| | {                                      | |
| |   "id": "...",                         | |
| |   "sale_id": "...",                    | |
| |   ...                                 | |
| | }                                      | |
| +----------------------------------------+ |
+--------------------------------------------+
```

## Detalhes Tecnicos

- Adicionar `Code` ao import do lucide-react
- Novo estado `showRawId` para controlar visibilidade do JSON
- Passar `showRawId` e `setShowRawId` para o componente `TransactionDetails` ou mover a logica para inline
- O JSON bruto exclui campos internos sensiveis como `user_id` e `client_id` antes de exibir
- ScrollArea horizontal no bloco de JSON para webhooks com muitos campos
