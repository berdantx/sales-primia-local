
# Correcao do Parser Eduzz para formato de planilha Febracis/Paulo Vieira

## Contexto
A planilha exportada da Eduzz tem um formato especifico:
- Cada venda gera 2 linhas com o mesmo numero de "Fatura": uma do Produtor (com valor real) e uma do Co-produtor (valor zerado)
- O parser atual nao reconhece as colunas dessa planilha, resultando em 0 importacoes

## O que sera feito

### 1. Corrigir mapeamento de colunas
O arquivo `src/lib/parsers/eduzzParser.ts` sera atualizado nos arrays `EDUZZ_COLUMNS`:

| Campo | Problema atual | Correcao |
|---|---|---|
| `saleId` | Nao encontra "Fatura" | Adicionar `'fatura'` (remover de `invoiceCode`) |
| `saleValue` | Match parcial pega "Valor do Cupom" (0,00) | Adicionar `'valor da venda'` no inicio do array |
| `saleDate` | Match parcial pega "Data de Criacao" | Adicionar `'data de pagamento'`, `'data do pagamento'` no inicio |
| `buyerName` | Nao encontra "Cliente / Nome" | Adicionar `'cliente / nome'` |
| `buyerEmail` | Nao encontra "Cliente / E-mail" | Adicionar `'cliente / e-mail'` |
| `buyerPhone` | Nao encontra "Cliente / Fones" | Adicionar `'cliente / fones'`, `'fones'` |
| `productId` | Nao encontra "ID do Produto" | Adicionar `'id do produto'` |

### 2. Filtrar linhas com valor zerado (Co-produtor)
Adicionar logica no `parseEduzzData` para descartar linhas onde o valor da venda e zero **e** ja existe outra linha com o mesmo ID de fatura com valor. Isso e mais seguro do que a deduplicacao atual que simplesmente mantém a primeira linha encontrada (que pode ser a do Co-produtor).

A logica sera:
1. Primeiro pass: agrupar linhas por `saleId`
2. Para cada grupo, manter a linha com maior `sale_value`
3. Descartar as demais como duplicatas

### 3. Resultado esperado
- 163 linhas no CSV → ~81 vendas unicas importadas (81 Produtor + 81 Co-produtor + 1 parcela PSL)
- Valor correto por venda (997,00 na maioria)
- Data de pagamento correta
- Dados do cliente (nome, email, telefone) corretamente mapeados

---

## Secao tecnica

### Arquivo a modificar
`src/lib/parsers/eduzzParser.ts`

### Mudancas detalhadas

**EDUZZ_COLUMNS** - atualizar arrays:
```text
saleId: ['fatura', 'codigo da venda', ...existentes]   // 'fatura' removido de invoiceCode
invoiceCode: ['codigo fatura', 'invoice_code', ...]      // sem 'fatura'
saleValue: ['valor da venda', 'valor liquido', ...]      // prioridade para match exato
saleDate: ['data de pagamento', 'data do pagamento', 'data da venda', ...]
buyerName: ['cliente / nome', 'nome', 'cliente', ...]
buyerEmail: ['cliente / e-mail', 'email', 'e-mail', ...]
buyerPhone: ['cliente / fones', 'fones', 'telefone', ...]
productId: ['id do produto', 'id produto', ...]
```

**parseEduzzData** - substituir deduplicacao simples por agrupamento inteligente:
```text
// Antes: mantinha primeira linha encontrada (podia ser Co-produtor com valor 0)
// Depois: agrupa por saleId, mantém a linha com maior sale_value
```

### Impacto
- Sem quebra de compatibilidade: novos nomes sao adicionados com prioridade, os antigos continuam funcionando
- Nenhuma outra pagina ou componente e afetado
