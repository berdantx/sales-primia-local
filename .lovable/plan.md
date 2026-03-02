

# Plano: Remover badges dos grupos da sidebar

## Mudança única

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Remover a propriedade `badge` de todos os objetos em `menuGroups`
- Remover o bloco de renderização do badge dentro do `SidebarGroupLabel`
- Manter os labels de grupo (`CORE`, `OPERAÇÃO`, `ADMIN`) no estilo atual: `text-[11px] font-semibold tracking-wider uppercase text-muted-foreground`
- Remover a interface `badge` do tipo `MenuGroup`

Resultado: labels de seção limpos, sem badges, mantendo hierarquia visual apenas com tipografia e espaçamento.

