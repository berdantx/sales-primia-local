# 🎯 REFINAMENTO PREMIUM — DASHBOARD EXECUTIVA HIGH TICKET

Aplicar os ajustes abaixo **sem alterar estrutura ou hierarquia da dashboard atual**.

Objetivo: elevar a percepção para nível “infraestrutura de decisão high ticket”, mantendo minimalismo, clareza e sofisticação.

---

# 🧠 1) RECEITA CONFIRMADA vs RECEITA PROJETADA (LÓGICA INTELIGENTE)

Arquivo: `src/pages/Dashboard.tsx`

### Quando `confirmed === projected`:

**Receita Confirmada**

- Subtitle:  
→ `"100% realizado"`
- Badge verde suave:
  - `bg-emerald-50 text-emerald-700 border-emerald-200`
- Transmitir sensação de caixa totalmente consolidado.

**Receita Projetada**

- Subtitle:  
→ `"Sem valores pendentes"`
- Badge neutro (não repetir verde):
  - `bg-muted text-foreground/70 border-border`

Objetivo: mostrar controle de caixa, não repetição visual.

---

### Quando `projected > confirmed`:

**Receita Confirmada**

- Mantém maior peso visual.

**Receita Projetada**

- `opacity-90`
- Subtitle:  
→ `"Inclui parcelas futuras"`
- Badge azul suave:
  - `bg-blue-50 text-blue-700 border-blue-200`

Regra:  
Confirmada sempre deve parecer mais sólida que Projetada.

---

# 🎯 2) META DO PERÍODO — TENSÃO E FOCO

Arquivos:

- `src/components/dashboard/ExecutiveKPICard.tsx`
- `src/pages/Dashboard.tsx`

### Ajustes visuais

- Barra de progresso: `h-1.5 → h-2`
- Percentual com `font-semibold`
- Texto “Faltam R$ X” com `font-medium`

### Cores dinâmicas da barra

- 0–40% → `bg-muted-foreground/30`
- 40–80% → `bg-blue-300`
- 80%+ → `bg-emerald-300`
- Abaixo do ritmo esperado → `bg-amber-300`

Sem vermelho forte.

---

# 📊 3) GRÁFICO — VIDA SEM POLUIÇÃO

Arquivo: `RevenueEvolutionChart.tsx`

- Confirmada → linha sólida
- Projetada → linha tracejada (quando existir)
- Último ponto destacado (dot r=5)
- Tooltip minimal:
  - `bg-popover`
  - `border-border`
  - sem sombra pesada
- Sem gradientes fortes

---

# 💎 4) BLOCO “O QUE ESTÁ PUXANDO O RESULTADO”

Arquivo: `TopProductsList.tsx`

### Ajustes:

- `space-y-4 → space-y-5`
- Barra de progresso: `h-1 → h-0.5`
- Receita: `text-base font-bold`
- Ranking numeral: `text-sm font-bold text-foreground`

Manter layout elegante e respirado.

---

# 🧠 5) BLOCO IA — PROTAGONISTA ESTRATÉGICO

Arquivo: `StrategicRecommendationCard.tsx`

### Ajustes:

- Título: `text-base font-bold`
- Fundo: leve tom azul (5%)
- Tags:
  - `border-primary/20`
  - fundo extremamente suave
- `space-y-4` nos alertas

Sem ícones grandes.  
Sem visual de chatbot.  
Transmissão: sistema que pensa.

---

# 🎨 6) MICRO-INTERAÇÕES (SUTIL E PREMIUM)

Aplicar hover elegante somente:

- 4 KPIs principais
- Bloco IA
- Top Produtos

Classe sugerida:  
`hover:shadow-md transition-all duration-200`

Se usar translate:

- Aplicar apenas nos 4 KPIs
- `hover:-translate-y-0.5`

Adicionar skeleton no loading:

- 4 skeletons para KPIs
- Skeleton para gráfico
- Skeleton para bloco IA

---

# 🏷️ 7) AJUSTES DE TÍTULOS (VERSÃO EXECUTIVA)

Atualizar títulos para linguagem mais estratégica:

### Header principal

De:  
"Visão Geral do Lançamento"

Para:  
"Centro de Comando do Lançamento"

Subtitle abaixo:  
"O que importa agora: caixa, ritmo e direção estratégica."

---

### Bloco gráfico

De:  
"Evolução Essencial"

Para:  
"Evolução de Receita"

---

### Bloco produtos

De:  
"O que está puxando o resultado"

Para:  
"Principais Alavancas de Receita"

---

### Bloco IA

De:  
"Recomendação Estratégica"

Para:  
"Direcionamento Estratégico do Sistema"

---

# 📐 8) REGRAS GERAIS (NÃO NEGOCIÁVEL)

- Light mode
- Fundo quase branco
- Bordas finas
- `rounded-2xl`
- Nada de gradiente pesado
- Nada de vermelho forte
- Nada de excesso de cor
- Layout respirado

---

# 🏁 RESULTADO FINAL ESPERADO

A dashboard deve parecer:

- Centro de comando de negócio high ticket
- Ferramenta de decisão
- Infraestrutura usada por empresa grande
- Produto de múltiplos milhões

Não deve parecer:

- Ferramenta de marketing
- Painel colorido
- Produto amador
- Sistema de agência