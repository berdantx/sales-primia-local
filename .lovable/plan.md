
# Plano: Landing Page Pública do Launch Pocket

## Visão Geral

Criar uma landing page pública na rota principal (`/`) para divulgação do Launch Pocket, exibida apenas para visitantes não logados. Usuários autenticados serão redirecionados automaticamente para o Dashboard.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                         FLUXO DE ACESSO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Visitante (não logado) ──> /  ──> LandingPage                 │
│                                      │                           │
│                                      ├── Hero Section            │
│                                      ├── Funcionalidades         │
│                                      ├── Screenshots/Demo        │
│                                      ├── Depoimentos             │
│                                      └── Formulário de Interesse │
│                                                                  │
│   Usuário (logado) ────────> /  ──> Dashboard (atual)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Seções da Landing Page

### 1. Hero Section
- Logo do Launch Pocket (usando branding settings)
- Título principal: "Tenha o controle do seu lançamento no bolso"
- Subtítulo explicativo sobre a proposta de valor
- Botão CTA: "Tenho Interesse" (scroll para formulário)
- Imagem/mockup ilustrativo

### 2. Funcionalidades/Benefícios
Cards com ícones destacando:
- Dashboard Multi-Plataforma (Hotmart, TMB, Eduzz)
- Gestão de Metas Inteligente
- Gestão de Leads Completa
- Automações e Webhooks
- Acesso Mobile (smartphone)

### 3. Screenshots/Demonstração
- Carrossel com capturas de tela do aplicativo
- Ou mockups ilustrativos das principais telas
- Animações suaves com Framer Motion

### 4. Depoimentos/Cases
- Cards com feedback de clientes (placeholders editáveis)
- Foto, nome, cargo e empresa do depoente
- Citação do feedback

### 5. Formulário de Interesse (CTA Final)
Campos obrigatórios:
- Nome completo
- E-mail
- WhatsApp (com máscara de telefone brasileiro)
- Instagram (@usuário)
- Botão: "Quero conhecer o Launch Pocket"

---

## Detalhes Técnicos

### Banco de Dados
Nova tabela `interest_leads` para armazenar os cadastros:

| Coluna       | Tipo         | Descrição                    |
|--------------|--------------|------------------------------|
| id           | uuid         | Chave primária               |
| name         | text         | Nome completo                |
| email        | text         | E-mail (único)               |
| whatsapp     | text         | Telefone WhatsApp            |
| instagram    | text         | @usuário do Instagram        |
| created_at   | timestamptz  | Data do cadastro             |
| utm_source   | text         | Origem do tráfego (opcional) |
| utm_medium   | text         | Meio (opcional)              |
| utm_campaign | text         | Campanha (opcional)          |

Políticas RLS:
- INSERT: Permitido para anônimos (visitantes)
- SELECT/UPDATE/DELETE: Apenas para usuários master

### Arquivos a Criar/Modificar

**Novos arquivos:**
- `src/pages/LandingPage.tsx` - Página principal da landing
- `src/components/landing/HeroSection.tsx` - Seção hero
- `src/components/landing/FeaturesSection.tsx` - Funcionalidades
- `src/components/landing/ScreenshotsSection.tsx` - Screenshots/Demo
- `src/components/landing/TestimonialsSection.tsx` - Depoimentos
- `src/components/landing/InterestForm.tsx` - Formulário de interesse
- `src/hooks/useInterestForm.ts` - Hook para submissão do formulário

**Arquivos a modificar:**
- `src/App.tsx` - Alterar rota `/` para nova lógica condicional
- `src/components/layout/MainLayout.tsx` - Manter lógica de redirect para Dashboard

### Lógica de Roteamento

```typescript
// src/App.tsx - Nova lógica da rota /
<Route 
  path="/" 
  element={
    <ConditionalHome />
  } 
/>

// ConditionalHome verifica autenticação:
// - Se logado: renderiza <Dashboard />
// - Se não logado: renderiza <LandingPage />
```

### Validação do Formulário
Usando Zod para validação:
- Nome: obrigatório, mínimo 3 caracteres
- E-mail: formato válido
- WhatsApp: formato brasileiro (11 dígitos)
- Instagram: inicia com @ (opcional) ou apenas username

### Responsividade
- Mobile-first design
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Navegação sticky com logo e CTA
- Seções empilhadas verticalmente no mobile

### Animações
- Fade-in suave ao scroll (Framer Motion)
- Transições nos cards de funcionalidades
- Carrossel de screenshots (Embla Carousel)

---

## Captação de UTMs

A landing page capturará automaticamente parâmetros UTM da URL:
- `?utm_source=instagram&utm_medium=stories&utm_campaign=lancamento`
- Esses valores serão salvos junto com o cadastro de interesse

---

## Próximos Passos Após Implementação

1. **Upload de Screenshots**: Adicionar imagens reais do app
2. **Depoimentos Reais**: Substituir placeholders por feedbacks reais
3. **Integração com CRM**: Opcional - enviar leads para ferramenta externa
4. **Notificação por Email**: Opcional - alertar admin sobre novos interessados
