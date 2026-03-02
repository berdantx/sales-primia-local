

## Página explicativa do IGPL

Criar uma nova página `/igpl` acessível a todos os usuários autenticados, com conteúdo institucional explicando a métrica proprietária.

### Estrutura da página

A página seguirá o layout padrão (`MainLayout`) e conterá:

1. **Hero section** -- Título "IGPL" em destaque, subtítulo "Índice Global de Performance de Lançamento", breve parágrafo de apresentação
2. **Como é calculado** -- Tabela/cards mostrando os 4 fatores (Ritmo 35%, Meta 30%, Conversão 20%, Timing 15%) com descrição de cada um
3. **Faixas de performance** -- Cards visuais com as 4 faixas (Saudável, Atenção, Risco Moderado, Crítico) usando as cores do sistema
4. **Como interpretar** -- Exemplos práticos de leitura ("O IGPL está em 72, o que significa...")
5. **FAQ** -- Perguntas frequentes usando Accordion (ex: "O que acontece se não tenho meta definida?", "Com que frequência o IGPL atualiza?")

### Arquivos envolvidos

- **Criar** `src/pages/IGPLExplainer.tsx` -- Página completa com todo o conteúdo
- **Editar** `src/App.tsx` -- Adicionar rota `/igpl` (acessível a todos os roles autenticados via ProtectedRoute)
- **Editar** `src/components/layout/AppSidebar.tsx` -- Adicionar link na sidebar (ícone `Activity`, dentro do grupo CORE ou como item standalone)
- **Editar** `src/components/dashboard/StrategicScoreCard.tsx` -- Adicionar um link discreto "Saiba mais" apontando para `/igpl`

### Detalhes técnicos

- Página estática (sem chamadas ao banco), apenas conteúdo educacional
- Usa componentes existentes: `Card`, `Accordion`, `Separator`
- Responsiva com grid adaptativo
- Inclui um gauge SVG decorativo similar ao do card real para reforçar a identidade visual
- Acessível a todos os roles (`master`, `admin`, `user`)

