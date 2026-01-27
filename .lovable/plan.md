
# Exibir ID do Cliente na Tabela de Clientes

## Objetivo
Adicionar uma coluna na tabela de clientes para exibir o ID (UUID) de cada cliente, facilitando a identificação para configuração de webhooks e integrações.

## Alterações

### Arquivo: `src/components/clients/ClientsTable.tsx`

1. **Adicionar coluna "ID" no cabeçalho da tabela**
   - Nova coluna após "Cliente" com o título "ID"

2. **Exibir o ID em cada linha**
   - Mostrar o UUID do cliente em formato monospace (code)
   - Incluir funcionalidade de copiar ao clicar (opcional, mas útil)
   - Estilo compacto para não ocupar muito espaço

3. **Ajustar colspan** da mensagem de tabela vazia (de 5 para 6)

## Resultado Visual

| Cliente | ID | Slug | Status | Criado em | Ações |
|---------|-----|------|--------|-----------|-------|
| Nome + Avatar | `uuid-do-cliente` | slug | Badge | Data | Botões |

## Detalhes Técnicos

- O ID será exibido com estilo `code` similar ao slug para consistência visual
- Adicionar botão de copiar com feedback visual (toast) para facilitar o uso em webhooks
- Importar ícone `Copy` do lucide-react
