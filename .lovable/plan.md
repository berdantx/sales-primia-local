

## Plano: Copiar transações reais para a conta BVAZ Educação

### Contexto dos dados disponíveis

Os clientes Paulo Vieira e Camila Vieira - 2026 possuem vendas em **TMB** e **Eduzz** (sem Hotmart). Os produtos com taxa de coprodução configurada (30%) para BVAZ são:

**Camila Vieira - 2026:** Mentoria Jornada Plenitude 2026, Mentoria Jornada da Plenitude 2.0., Filhos, Relacionamentos, Criação de Riqueza, VIP Diamond, Viva á sua real Identidade (LOTE 0 e 1)

**Paulo Vieira:** CIS Online, CIS Online Plataforma Streaming FEBRACIS, Método CIS Online

### O que será feito

Inserir **20 transações reais** (10 TMB + 10 Eduzz) na conta BVAZ Educação (`48b4bd48-a02b-4c5b-bc4f-1669328acb4c`), copiando dados dos últimos dias (fevereiro/março 2026):

1. **10 transações TMB** — Mentoria Jornada Plenitude 2026 (R$ 2.397 cada = R$ 23.970)
2. **10 transações Eduzz** — Mix de produtos: Mentoria Jornada da Plenitude 2.0., Filhos, CIS Online, Relacionamentos (~R$ 22.000+)

Cada transação terá um `order_id`/`sale_id` prefixado com `BVAZ-` para evitar conflitos com os registros originais. O `user_id` será o do master (`23c1ff38-9996-4b70-a8bb-165b0ac18797`), mantendo nomes/emails reais dos compradores.

### Resultado esperado

O dashboard da BVAZ Educação exibirá ~R$ 256.000 em receita total (R$ 210k CIS PAY + ~R$ 46k TMB/Eduzz), com dados visíveis nos KPIs, gráfico de evolução e pizza de plataformas.

