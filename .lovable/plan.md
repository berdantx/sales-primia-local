Berdan, tá **bem bom**. O Lovable pegou a essência certinha ✅  
Eu só faria uns **ajustes finos** (pra ficar ainda mais “executivo” e menos “calculadora”), sem mudar a estrutura.

Abaixo vai o **prompt final** pra você mandar pro Lovable, já incorporando o plano dele + melhorias de título/labels + regras pra não virar número jogado.

---

## ✅ PROMPT PARA O LOVABLE (VERSÃO FINAL) — “RITMO NECESSÁRIO” (HIGH TICKET)

Quero seguir exatamente o plano abaixo (transformar o bloco de projeções em um motor estratégico de ritmo), porém com alguns ajustes finos de linguagem, layout e cálculo para ficar mais premium e orientado a decisão.

### 1) Atualizar `GoalProgress` (cálculo completo)

**Arquivo:** `src/lib/calculations/goalCalculations.ts`

- Adicionar `daysElapsed` e `totalDays` no `GoalProgress`.
- Garantir também `daysRemaining` (se já existir, manter).
- `daysElapsed` nunca pode ser 0 (se for, usar 1 para evitar divisão por zero).

**Regras de cálculo**

- `ritmoNecessarioDiario` = `remaining / daysRemaining`
- `ritmoAtualDiario` = `totalSold / daysElapsed`
- `projecaoFechamento` = `ritmoAtualDiario * totalDays`

**Derivados**

- semanal = diário × 7
- mensal = diário × 30 (ok manter 30 fixo)

### 2) Reescrever `ProjectionCards` como um ÚNICO card

**Arquivo:** `src/components/dashboard/ProjectionCards.tsx`

Substituir os 3 cards antigos por um card único com o seguinte layout:

#### Título (novo)

**"Ritmo Necessário para Fechamento"**

#### Subtítulo (novo)

**"Ritmo exigido vs ritmo atual, com projeção de fechamento."**

---

### 3) Layout interno (grade limpa e executiva)

- Card com `rounded-2xl`, borda fina `border-border`, sombra sutil `shadow-sm`.
- Grid 2 colunas no desktop, 1 coluna no mobile.

#### Coluna esquerda: **Ritmo Necessário**

Label pequena (muted):  
“Ritmo Necessário”

Linhas:

- Diário: R$ X
- Semanal: R$ X
- Mensal: R$ X

#### Coluna direita: **Ritmo Atual**

Label pequena (muted):  
“Ritmo Atual”

Linhas:

- Diário: R$ X
- Semanal: R$ X
- Mensal: R$ X

---

### 4) Status de ritmo (uma linha clara)

Abaixo das colunas, mostrar 1 status:

- Se `ritmoAtualDiario < ritmoNecessarioDiario`:  
Texto: **"Ritmo abaixo do necessário"**  
Classe: `text-amber-600 text-sm font-medium`
- Caso contrário:  
Texto: **"Ritmo alinhado com a meta"**  
Classe: `text-emerald-600 text-sm font-medium`

**Observação:** não usar vermelho. Não usar alerta grande.

---

### 5) Linha divisória + Projeção (principal diferencial)

Adicionar divisória sutil e uma seção final:

Label muted:  
**"Projeção de Fechamento no Ritmo Atual"**

Valor grande:  
**R$ XXXXX** (large, bold)

Texto auxiliar:  
“Se o ritmo atual for mantido até o fim do período.”

Comparativo:

- Se `projecaoFechamento < goal`:  
“Faltariam R$ X para atingir a meta.”  
`text-amber-600 text-sm`
- Se `projecaoFechamento >= goal`:  
“Meta será superada no ritmo atual.”  
`text-emerald-600 text-sm`

---

### 6) Ajustes premium de tipografia e espaçamento

- Números: `text-lg` ou `text-xl` com `font-semibold`
- Labels: `text-xs text-muted-foreground uppercase tracking-wide`
- Espaçamento interno: confortável (não compacto demais)
- Manter estética “ferramenta financeira”, sem enfeites

---

### 7) Regras visuais (obrigatórias)

- Fundo neutro
- Sem gradientes
- Sem cores fortes nos cards
- Apenas `amber` e `emerald` para status
- Nada de ícones grandes (se usar, só um mini e bem discreto)

---

### 8) Compatibilidade

Não alterar como `GoalSummarySection` renderiza `ProjectionCards`.  
O componente deve continuar aceitando as props atuais (apenas enriquecendo com o novo cálculo via `GoalProgress`).