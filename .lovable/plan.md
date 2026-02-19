

# Corrigir Diagnostico CORS

## Problema
O teste atual envia `fetch` com `method: 'OPTIONS'` manualmente pelo browser. Isso nao funciona porque:
1. O browser trata a propria requisicao OPTIONS como cross-origin
2. A requisicao precisa de um preflight para si mesma (loop impossivel)
3. Resultado: "Failed to fetch" em todas as funcoes

## Solucao
Substituir o teste OPTIONS manual por requisicoes reais (POST com body vazio) que naturalmente disparam o preflight do browser. Se a requisicao chegar ao servidor e retornar com headers CORS, o teste passa. Se o browser bloquear, e um problema CORS real.

## Mudancas

### Arquivo: `src/pages/CorsDiagnostics.tsx`

**Logica do teste (`testFunction`)**:

1. **Teste real**: Enviar um POST com `Content-Type: application/json` e headers `apikey` + `authorization` (igual ao que a app faz normalmente). O browser fara o preflight automaticamente.
2. **Verificar resposta**: Se a resposta chegar (qualquer status HTTP), o CORS esta funcionando. Extrair os headers `access-control-*` da resposta.
3. **Classificar resultado**:
   - `success` - requisicao completou (CORS OK), independente do status HTTP (401, 400, etc. sao esperados pois nao estamos enviando payload valido)
   - `cors-error` - browser bloqueou a requisicao (TypeError: Failed to fetch)
   - `timeout` - demorou mais de 10s
4. **Exibir info extra**: Mostrar o status HTTP real da resposta (401, 200, etc.) para contexto

**Nova coluna na tabela**: Remover coluna "CORS Headers" (nao acessiveis via fetch normal) e manter foco no resultado binario: passou ou nao passou.

**Melhoria visual**: Adicionar card de resumo no topo com contagem de sucesso/falha e explicacao do que o teste faz.

### Detalhes tecnicos da mudanca

Substituir o metodo `testFunction` de:
```typescript
// ATUAL - nao funciona
const preflightRes = await fetch(url, {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin,
    'Access-Control-Request-Method': 'POST',
    ...
  },
});
```

Para:
```typescript
// NOVO - funciona
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  },
  body: JSON.stringify({}),
});
// Se chegou aqui, CORS esta OK
// Status 401/400/500 sao esperados (payload invalido)
```

### Arquivos alterados
1. `src/pages/CorsDiagnostics.tsx` - reescrever logica de teste e ajustar tabela de resultados
