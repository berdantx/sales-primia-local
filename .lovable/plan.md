
## Adicionar botao "Landing Page" no menu lateral

### O que sera feito
Adicionar um item de menu no sidebar que permite ao usuario logado visualizar a landing page publica. O botao abrira a rota `/landing` em uma nova aba do navegador, ja que a landing page tem layout proprio (sem sidebar/header do dashboard).

### Detalhes tecnicos

1. **Criar rota `/landing`** no `App.tsx` que renderiza o componente `LandingPage` diretamente (sem `ProtectedRoute` ou `MainLayout`), acessivel para qualquer usuario.

2. **Adicionar item no sidebar** (`AppSidebar.tsx`):
   - Novo item no grupo "Sistema" com icone `Globe` (lucide-react)
   - Titulo: "Landing Page"
   - Restrito a roles `master` e `admin`
   - Ao clicar, abre a rota `/landing` em uma nova aba (`window.open`)

3. **Arquivos modificados**:
   - `src/App.tsx` - Adicionar rota `/landing`
   - `src/components/layout/AppSidebar.tsx` - Adicionar item de menu com comportamento de abrir em nova aba
