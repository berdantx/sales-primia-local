
# Fix: Menu de Coprodutor nao exibido

## Diagnostico

Apos analisar o codigo e a base de dados:
- O usuario `berdantx@gmail.com` tem role `master` corretamente configurado
- Existe 1 coprodutor ativo no sistema (`bvazeua@gmail.com`)
- O item "Coprodução" esta configurado no sidebar para todas as roles
- A logica condicional `{isMaster && (...)}` esta correta no codigo

O problema mais provavel e que o componente `Select` (dropdown) esta com **fundo transparente**, fazendo com que o conteudo do menu fique invisivel ou sobreponha elementos. Este e um problema recorrente documentado no projeto.

## Solucao

### 1. Garantir visibilidade do SelectContent no dropdown de coprodutor

Adicionar classes de background e z-index explicitos ao `SelectContent` no arquivo `src/pages/Coproduction.tsx`:

```text
<SelectContent className="bg-background border z-50">
```

### 2. Adicionar logs de debug temporarios (para confirmar que os dados carregam)

Caso o problema persista, adicionar `console.log` temporario no hook `useAllCoproducers` para verificar se os dados estao sendo retornados corretamente.

## Detalhes Tecnicos

### Arquivo editado: `src/pages/Coproduction.tsx`

- Linha 98: Adicionar `className="bg-background border z-50"` ao `SelectContent`
- Isso garante que o dropdown tenha fundo solido e fique acima de outros elementos

### Verificacao adicional

- Confirmar que o `useUserRole` retorna `isMaster: true` para o usuario logado
- Se o problema for que o item nao aparece no sidebar, verificar se a rota `/coproduction` esta registrada no `App.tsx` (ja esta)
