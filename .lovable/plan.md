
# Melhorar UX da Pagina de Configuracoes

## Problema Atual

A pagina de Settings e uma lista longa de cards empilhados verticalmente (ate 9 cards para um usuario master). Nao ha agrupamento logico, navegacao rapida, nem indicacao visual de qual secao o usuario esta vendo. Isso dificulta encontrar configuracoes especificas.

## Solucao Proposta: Navegacao por Abas + Agrupamento por Categorias

Reorganizar a pagina usando o componente `Tabs` (ja disponivel no projeto via Radix UI) para dividir as configuracoes em categorias logicas com navegacao horizontal.

### Categorias propostas

| Aba | Conteudo | Visivel para |
|-----|----------|--------------|
| **Conta** | Perfil (email, membro desde) + Alterar Senha | Todos |
| **Aparencia** | Branding (logo, cores, nome do app) | Master |
| **Sistema** | Cadastro (signup settings) + Backup + Auditoria de Transacoes | Admin/Master |
| **Moedas** | Moedas Detectadas + Alertas de Conversao | Admin/Master |
| **Integracoes** | LLM Integrations | Admin/Master |
| **Sobre** | Versao, template, moedas suportadas | Todos |

### Comportamento

- As abas sao filtradas por role (usuario comum ve apenas "Conta" e "Sobre")
- A aba ativa e salva na URL via query param (`?tab=sistema`) para permitir links diretos
- A aba "Moedas" mostra um badge de contagem se houver alertas pendentes (reutiliza `useCurrencyAlerts`)
- Layout responsivo: em mobile, as abas viram um menu dropdown ou scroll horizontal

### Melhorias adicionais

1. **Header com resumo rapido**: Mostrar o nome do usuario e role como badge ao lado do titulo
2. **Scroll suave**: Ao trocar de aba, o conteudo aparece com animacao suave (ja usa framer-motion)
3. **Indicador de alertas**: Badge vermelho na aba "Moedas" quando ha alertas pendentes, para chamar atencao

---

## Detalhes Tecnicos

### Arquivo editado: `src/pages/Settings.tsx`

Refatorar para usar `Tabs` do Radix UI com as seguintes mudancas:

- Importar `Tabs, TabsContent, TabsList, TabsTrigger` de `@/components/ui/tabs`
- Criar array de abas filtrado por role
- Usar `searchParams` do react-router para persistir a aba ativa na URL
- Mover cada grupo de cards para dentro do respectivo `TabsContent`
- Adicionar badge de contagem na aba "Moedas" usando o hook `useCurrencyAlerts`

### Estrutura resultante (simplificada)

```text
+------------------------------------------------------+
| Configuracoes                                         |
| Gerencie sua conta e preferencias    [Admin badge]    |
+------------------------------------------------------+
| [Conta] [Aparencia] [Sistema] [Moedas (3)] [Integr.] |
+------------------------------------------------------+
|                                                       |
|   (Conteudo da aba selecionada)                       |
|                                                       |
+------------------------------------------------------+
```

### Nenhum arquivo novo necessario

Toda a mudanca acontece em `src/pages/Settings.tsx`, reorganizando os componentes existentes dentro da estrutura de abas. Os cards individuais (`BrandingSettingsCard`, `BackupCard`, etc.) permanecem inalterados.
