

## Plano: Teste de Conexão PostgreSQL Externo

### O que será feito

1. **Armazenar credenciais como secrets** — Adicionar 5 secrets (`EXTERNAL_PG_HOST`, `EXTERNAL_PG_PORT`, `EXTERNAL_PG_DATABASE`, `EXTERNAL_PG_USER`, `EXTERNAL_PG_PASSWORD`) para não expor as credenciais no código.

2. **Criar edge function `test-external-pg`** — Função simples que usa `deno-postgres` para tentar abrir uma conexão TCP com o PostgreSQL externo, executar `SELECT 1` e retornar sucesso/erro com tempo de resposta.

3. **Adicionar seção na página de Diagnóstico CORS** — Um novo card "Conexão PostgreSQL Externo" com botão "Testar Conexão" que chama a edge function e exibe:
   - Status (conectado / erro / timeout)
   - Tempo de resposta
   - Versão do PostgreSQL (se conectar)
   - Mensagem de erro (se falhar)

### Fluxo

```text
CorsDiagnostics.tsx  →  edge function test-external-pg  →  PostgreSQL 187.77.225.140:5433
     (botão)              (deno-postgres driver)              (SELECT 1 + SELECT version())
```

### Considerações
- Se a conexão TCP for bloqueada por firewall, o teste retornará timeout — isso já será informativo para saber se precisa liberar acesso.
- As credenciais ficam seguras como secrets, acessíveis apenas pela edge function.

