
# Botao "Ver mais detalhes" com dropdown expandivel por transacao

## Resumo
Adicionar em cada linha da tabela de transacoes do cliente um botao "Ver mais detalhes da compra" que expande um dropdown (collapsible) mostrando todos os dados completos da transacao.

## O que muda

### Editar: `src/components/dashboard/CustomerDetailDialog.tsx`

**1. Buscar todos os campos de cada tabela (nao apenas os resumidos)**
- Hotmart: trazer todos os campos (`*`) incluindo billing_type, payment_method, sck_code, country, gross_value_with_taxes, total_installments, recurrence_number, business_model, offer_code, subscriber_code, subscription_status, source, buyer_phone, etc.
- TMB: trazer todos os campos incluindo buyer_phone, status, cancelled_at, utm_source, utm_medium, utm_campaign, utm_content, source
- Eduzz: trazer todos os campos incluindo buyer_phone, invoice_code, product_id, original_value, original_currency, utm_source, utm_medium, utm_campaign, utm_content, source

**2. Atualizar a interface `UnifiedTransaction`**
- Adicionar campo `rawData: Record<string, any>` para armazenar todos os dados originais da transacao

**3. Adicionar estado de expansao**
- Estado `expandedId: string | null` para controlar qual linha esta expandida

**4. Adicionar botao e area expandivel por linha**
- Abaixo de cada `TableRow`, renderizar uma linha extra (condicional) quando `expandedId === t.id`
- Botao "Ver mais detalhes da compra" com icone ChevronDown/ChevronUp
- Ao expandir, mostrar um grid com todos os campos do `rawData` formatados em pares label/valor
- Campos exibidos variam por plataforma:
  - **Hotmart**: Nome, Email, Telefone, Pais, Produto ID, Metodo Pagamento, Tipo Cobranca, Modelo Negocio, Codigo Oferta, SCK, Parcelas, Recorrencia, Status Assinatura, Codigo Assinante, Valor Bruto, Comissao Produtor, Comissao Marketplace, Moeda Original, Valor Original, Fonte
  - **TMB**: Nome, Email, Telefone, Status, Data Cancelamento, UTM Source/Medium/Campaign/Content, Fonte
  - **Eduzz**: Nome, Email, Telefone, Codigo Fatura, Produto ID, Valor Original, Moeda Original, UTM Source/Medium/Campaign/Content, Fonte

## Detalhes Tecnicos

### Componentes utilizados
- `Collapsible` do Radix UI (ja instalado) para o efeito de expandir/recolher
- `ChevronDown` / `ChevronUp` do lucide-react para o icone do botao
- `Button` com variant `ghost` e tamanho `sm`

### Estrutura da tabela expandida
Cada linha da tabela tera:
1. A `TableRow` normal (como esta hoje)
2. Uma `TableRow` extra com `colspan=5` que aparece apenas quando expandida, contendo um grid 2 ou 3 colunas com os detalhes

### Queries
- Mudar os `.select(...)` especificos para `.select('*')` nas 3 queries (Hotmart, TMB, Eduzz)
- Salvar o objeto completo em `rawData` para renderizar no dropdown

### Labels por plataforma
Um mapa de labels sera criado para traduzir os nomes das colunas do banco para labels amigaveis em portugues, por exemplo:
- `payment_method` -> "Metodo de Pagamento"
- `billing_type` -> "Tipo de Cobranca"
- `buyer_phone` -> "Telefone"
- `utm_source` -> "UTM Source"
