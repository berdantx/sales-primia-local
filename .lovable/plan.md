
# Corrigir Layout do Modal de Resumo de Leads

## Problemas identificados no print
1. O conteudo do modal ultrapassa a altura da tela sem scroll, empurrando o botao "Fechar" para fora da area visivel
2. Os numeros de trafego (ex: "71.31") estao sendo cortados por falta de espaco
3. Os nomes longos dos anuncios ocupam muito espaco horizontal

## Solucao

### Arquivo: `src/components/leads/LeadsSummaryDialog.tsx`

1. Adicionar `max-h-[80vh]` e `overflow-y-auto` no `DialogContent` para que o conteudo role quando ultrapassar a altura da tela
2. Usar `flex-shrink-0` nos numeros de trafego para evitar que sejam cortados
3. Garantir que os nomes dos anuncios usem `truncate` corretamente (ja esta, mas o container precisa de `overflow-hidden`)
4. Manter o `DialogFooter` fixo na parte inferior

### Detalhes tecnicos
- Adicionar classe `max-h-[80vh] overflow-y-auto` ao `DialogContent`
- Nos itens de trafego, adicionar `whitespace-nowrap` e `flex-shrink-0` no span dos numeros para evitar quebra
- Nenhuma alteracao de banco de dados necessaria
