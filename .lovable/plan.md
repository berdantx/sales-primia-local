

## Plan: Promote Leads to Top-Level Navigation

**What changes:** Move "Leads" out of the "Análise" collapsible subgroup and place it as a top-level item in the CORE section, right after "IGPL". The "Funil" item stays inside the "Análise" subgroup (or the subgroup is removed entirely if "Funil" is the only remaining item).

**Structure before:**
```text
CORE
  Painel
  IGPL
  ▸ Vendas (collapsible)
  ▸ Análise (collapsible)
      Leads
      Funil
```

**Structure after:**
```text
CORE
  Painel
  IGPL
  Leads          ← promoted to top-level
  ▸ Vendas (collapsible)
  ▸ Análise (collapsible)
      Funil
```

**Implementation (single file):**
- **`src/components/layout/AppSidebar.tsx`** — Add `Leads` to the `items` array of the CORE group (after IGPL), and remove it from the Análise subgroup's `items`, leaving only "Funil" inside Análise.

