
# Busca Completa de Duplicatas

## O que muda
Adicionar um botao "Busca Completa" no dialog de busca de duplicatas. Esse botao faz uma varredura automatica em todas as transacoes do cliente selecionado (sem precisar digitar nada), agrupa por ID de transacao e por email+produto, e mostra apenas os grupos que tem duplicatas. O campo de busca manual continua existindo para buscas direcionadas.

## Como vai funcionar
1. O usuario abre o dialog "Buscar Duplicata"
2. Ele ve o campo de busca manual (como ja existe) E um novo botao "Busca Completa"
3. Ao clicar em "Busca Completa", o sistema busca TODAS as transacoes do cliente na(s) plataforma(s) selecionada(s)
4. O sistema agrupa por ID de transacao e por email+produto
5. Mostra apenas os grupos que possuem mais de 1 registro (ou seja, duplicatas reais)
6. O usuario pode remover individualmente ou em lote, como ja funciona

## Detalhes tecnicos

### Arquivo: `src/components/audit/SearchDuplicateDialog.tsx`

1. **Adicionar botao "Busca Completa"** ao lado do botao "Buscar" existente

2. **Criar funcao `handleFullScan`**:
   - Nao exige `searchTerm` (busca sem filtro de texto)
   - Busca todas as transacoes do cliente com `client_id = clientId` (sem `.or()`)
   - Usa paginacao para buscar alem do limite de 1000 (loop com `.range()` ate esgotar)
   - Reutiliza `groupResults()` para agrupar
   - Filtra os grupos para exibir **apenas** os que tem `isDuplicate: true`
   - Exibe contador de duplicatas encontradas

3. **Adicionar estado `isFullScan`** para diferenciar busca manual de busca completa:
   - Na busca manual: mostra todos os resultados (duplicatas e nao-duplicatas), como ja faz
   - Na busca completa: mostra apenas os grupos duplicados

4. **UI do botao**: variant="outline", icone `SearchCheck` ou `ScanSearch` do lucide, texto "Busca Completa"

### Fluxo

```text
[Dialog aberto]
  - Campo de busca (opcional)
  - Plataforma: Todas | Hotmart | TMB | Eduzz
  - [Buscar] (busca com termo digitado)
  - [Busca Completa] (varre tudo do cliente)
        |
        v
[Busca Completa clicado]
  - Busca TODAS transacoes do cliente (sem filtro de texto)
  - Agrupa por ID e por email+produto
  - Filtra apenas grupos com 2+ registros
  - Exibe: "X grupos de duplicatas encontrados (Y registros)"
        |
        v
[Resultados - apenas duplicatas]
  - Checkbox + lixeira para remover
  - Clique na linha abre detalhes
```

### Paginacao para buscar todos os registros
Como o Supabase limita a 1000 registros por query, a busca completa fara um loop:
```
let all = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data } = await supabase.from(table).select(...).eq('client_id', clientId).range(from, from + PAGE - 1);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
```

### Nenhuma migracao necessaria
