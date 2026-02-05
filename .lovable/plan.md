
# Plano de Rebranding: Primia -> Launch Pocket

## Conceito
O novo nome **Launch Pocket** transmite a ideia de que o cliente tem o controle total do seu lançamento no bolso - acessível a qualquer momento do smartphone.

---

## Alterações Necessárias

### 1. Configurações de Branding (Banco de Dados)
Atualizar os valores na tabela `app_settings`:
- `app_name`: De "Primia - Analytics" para "Launch Pocket"
- `app_subtitle`: De "Gestão de Leads e Vendas" para "Seu lançamento no bolso"

### 2. Metadados da Página (index.html)
Atualizar:
- Título: "Launch Pocket - Sales Analytics"
- Meta description
- Open Graph title/description
- Twitter title/description

### 3. Valores Padrão do Sistema

**Arquivo: `src/hooks/useBrandingSettings.ts`**
- Alterar `DEFAULT_SETTINGS.appName` para "Launch Pocket"
- Alterar `DEFAULT_SETTINGS.appSubtitle` para "Seu lançamento no bolso"

**Arquivo: `src/components/settings/BrandingSettingsCard.tsx`**
- Atualizar placeholder do campo de nome

### 4. Edge Function de Convites

**Arquivo: `supabase/functions/send-invitation/index.ts`**
- Email de origem: De `Sales Analytics <noreply@sales.primia.ai>` para `Launch Pocket <noreply@launchpocket.app>` (ou domínio disponível)
- Texto do email: Atualizar referências a "Sales Analytics"
- Subject: "Você foi convidado para o Launch Pocket!"

### 5. Documentação de Webhook

**Arquivo: `src/pages/WebhookDocs.tsx`** (linha 215)
- Atualizar exemplo de nome do webhook: De "Leads AnalyzeFlow" para "Leads Launch Pocket"

---

## Arquivos que NÃO precisam ser alterados

Os seguintes arquivos contêm referências a "Primia" relacionadas a integrações/sources de leads (não são o nome do produto):
- `supabase/functions/leads-webhook/index.ts` - Define "primia" como fonte de leads
- `src/components/leads/LeadsTable.tsx` - Labels de fonte "Primia - Whatsapp"
- `src/components/leads/LeadsFilters.tsx` - Filtros por fonte

Estas referências são para classificação de leads vindos da plataforma Primia como fonte de tráfego, não o nome do sistema.

---

## Detalhes Técnicos

```text
┌─────────────────────────────────────────────────────────────┐
│                    ALTERAÇÕES DE CÓDIGO                     │
├─────────────────────────────────────────────────────────────┤
│  index.html                                                 │
│    └─ title, meta tags (og:title, twitter:title, etc.)     │
├─────────────────────────────────────────────────────────────┤
│  src/hooks/useBrandingSettings.ts                          │
│    └─ DEFAULT_SETTINGS.appName                              │
│    └─ DEFAULT_SETTINGS.appSubtitle                          │
├─────────────────────────────────────────────────────────────┤
│  src/components/settings/BrandingSettingsCard.tsx          │
│    └─ placeholder do input                                  │
├─────────────────────────────────────────────────────────────┤
│  supabase/functions/send-invitation/index.ts               │
│    └─ from: email                                           │
│    └─ subject                                               │
│    └─ html body                                             │
├─────────────────────────────────────────────────────────────┤
│  src/pages/WebhookDocs.tsx                                 │
│    └─ exemplo de nome de webhook                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ALTERAÇÃO NO BANCO                       │
├─────────────────────────────────────────────────────────────┤
│  app_settings                                               │
│    UPDATE key='app_name' SET value='Launch Pocket'         │
│    UPDATE key='app_subtitle' SET value='Seu lançamento...' │
└─────────────────────────────────────────────────────────────┘
```

---

## Sobre o Logo

O sistema já possui a funcionalidade de upload de logo customizado nas configurações de branding. Após as alterações de código, você poderá:
1. Acessar **Configurações > Branding & Tema**
2. Fazer upload do novo logo do Launch Pocket (versões clara e escura)
3. Salvar as alterações

---

## Nota sobre Domínio de Email

Para o email de convites, será necessário:
- Ter um domínio configurado (ex: `launchpocket.app` ou similar)
- Configurar o domínio no Resend para envio de emails
- Atualizar a edge function com o novo endereço de email

Se ainda não houver domínio, podemos manter um email genérico temporariamente.
