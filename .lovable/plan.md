## ✅ PROMPT PARA O LOVABLE — AJUSTES FINOS (PERCEPÇÃO INSTITUCIONAL)

**Contexto:** Refine o bloco **“Ritmo Necessário para Fechamento”** para ficar mais **finance terminal / institucional**, sem mudar a estrutura nem adicionar novas fontes de dados. Tudo deve ficar contido em `src/components/dashboard/ProjectionCards.tsx`.

### 1) Separador vertical entre colunas (desktop)

No layout desktop onde existem as 2 colunas **Ritmo Necessário** e **Ritmo Atual**, adicionar um separador vertical bem fino para reforçar leitura de “tabela comparativa”.

**Regras:**

- Só aparece em `sm:` ou `md:` pra cima.
- Cor sutil (`border-border` com opacidade leve).
- Não deve “gritar”.

**Implementação sugerida (livre):**

- Grid com `divide-x` + `divide-border/60` (aplicado apenas no breakpoint desktop)  
OU
- Container `relative` + linha `absolute` central.

---

### 2) Dar hierarquia para o “Diário” (mais acionável)

O número de **Diário** é o mais importante.  
Aumentar ligeiramente o peso visual APENAS dessa linha.

**Regras:**

- Linha “Diário” fica mais proeminente:
  - Valor: `text-xl font-bold`
  - Label: `font-medium`
- “Semanal” e “Mensal” continuam:
  - Valor: `text-lg font-semibold` (ou `text-base font-semibold`)
- Não mudar espaçamento geral.

---

### 3) “Verdict zone” com faixa sutil (diagnóstico)

A seção do diagnóstico (bolinha + texto “Ritmo atual não sustenta…”, etc.) deve virar uma área com leve destaque, estilo “zona de veredito”.

**Regras:**

- Envolver essa seção com um strip/pill:
  - `rounded-xl px-4 py-3`
  - background sutil e sem saturação forte
- Cores:
  - Se status “ok”: `bg-emerald-50 text-emerald-700 border-emerald-200`
  - Se status “atenção”: `bg-amber-50 text-amber-700 border-amber-200`
- Borda fina (`border`) e sem sombra.
- Dark mode deve ter equivalente:
  - `dark:bg-emerald-950/20` ou `dark:bg-amber-950/20`
  - `dark:border-.../30`

---

### 4) Indicador micro do gap (visual reinforcement)

Ao lado do texto percentual do gap (ex: “16% abaixo do exigido”), adicionar um mini indicador visual **sem novo dado**:

- Uma barrinha horizontal muito discreta (tipo `h-1 w-16 rounded-full bg-muted`), preenchida proporcionalmente pela razão `ritmoAtual/ritmoNecessario`.
- A cor do fill segue o status:
  - emerald se alinhado
  - amber se abaixo

**Regras:**

- Pequeno, inline, quase “HUD”.
- Não pode virar gráfico.
- Sem animações exageradas.

---

### 5) Seção “Fechamento Projetado” com contexto da meta

No bloco inferior “Fechamento Projetado”, abaixo do valor grande, exibir uma linha de referência com o valor da meta para comparação instantânea.

**Adicionar:**

- Linha: `Meta: R$ 10.000.000,00` (valor já existe no contexto da dashboard; reutilizar props/dados existentes, sem fetch novo)
- Estilo sutil:
  - `text-sm text-muted-foreground`
  - Espaçamento curto (ex: `mt-1`)

---

### Regras gerais (importante)

- Não alterar a estrutura do layout fora deste bloco.
- Não adicionar novas consultas, apenas UI.
- Manter estética “clean e premium”, sem gradientes pesados.
- Manter fontes e tokens do design system atual.
- Tudo deve ficar em `ProjectionCards.tsx`.

---

&nbsp;