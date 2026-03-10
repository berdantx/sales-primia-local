
Objetivo
- Fazer o filtro de plataforma ficar realmente funcional no Dashboard: ao clicar em Eduzz/TMB/Hotmart/CIS PAY, os cards e totais devem refletir somente a plataforma selecionada (e “Todas” mantém o consolidado).

Diagnóstico (causa raiz)
- O clique do botão já está funcionando (estado `platform` muda no `FilterContext`).
- O problema está no cálculo dos valores do Dashboard (`src/pages/Dashboard.tsx`): a receita é sempre somada com Hotmart + TMB + Eduzz + CIS PAY, independentemente da plataforma ativa.
- Por isso parece que os botões “não funcionam”, mesmo quando a seleção visual muda.

Plano de implementação
1) Tornar cálculo de receita sensível à plataforma
- Arquivo: `src/pages/Dashboard.tsx`
- Refatorar o `useMemo` de `revenue` para usar `switch(platform)`:
  - `all`: mantém consolidado atual.
  - `hotmart`: usa só Hotmart (incluindo USD convertido e projeção Hotmart).
  - `tmb`: usa só TMB.
  - `eduzz`: usa só Eduzz (BRL + USD convertido).
  - `cispay`: usa só CIS PAY.
- Garantir que `confirmed`, `projected`, `hotmartBRL`, `tmbBRL`, `eduzzBRL`, `cispayBRL`, `totalUSD` fiquem coerentes com a plataforma ativa.

2) Propagar o cálculo corrigido para os cards principais
- Ainda em `Dashboard.tsx`, os componentes que já consomem `revenue` passarão a responder corretamente sem mudança estrutural:
  - “Receita Confirmada”
  - “Receita Projetada”
  - `StrategicRecommendationCard` (usa `totalRevenue`)
  - `PlatformSharePieChart` (quando plataforma específica, exibe só a fatia correspondente; em “Todas”, exibe distribuição completa).

3) Blindar interação dos botões de plataforma
- Arquivo: `src/components/dashboard/PlatformFilter.tsx`
- Adicionar `type="button"` nos botões para evitar qualquer comportamento implícito de submit em cenários com formulário.
- (Opcional de robustez) adicionar `aria-pressed` para melhorar semântica e acessibilidade do estado ativo.

4) Validação funcional (E2E manual)
- Com mesmo cliente/período:
  - Clicar “Todas” e anotar valores.
  - Clicar “Eduzz” e validar que KPIs mudam para total Eduzz.
  - Clicar “TMB” e validar que KPIs mudam para total TMB.
  - Repetir para Hotmart e CIS PAY.
- Confirmar que:
  - gráfico de evolução acompanha a plataforma,
  - pie chart acompanha a plataforma,
  - voltar para “Todas” recompõe consolidado.

Detalhes técnicos
- Arquivos-alvo:
  - `src/pages/Dashboard.tsx` (principal correção)
  - `src/components/dashboard/PlatformFilter.tsx` (robustez de clique)
- Sem mudanças de banco, autenticação ou backend.
- Sem quebrar a lógica existente de filtros por período/cliente.
- Mantemos a regra atual de “empty state” global para não esconder dashboard quando só uma plataforma tem dados.

Resultado esperado
- Os botões de plataforma passam a ser percebidos como funcionais porque os valores vendidos exibidos (cards e totais) mudam de fato conforme a plataforma selecionada.
