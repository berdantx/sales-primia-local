

## Configuracao do Icone PWA nas Settings

### O que sera feito
Adicionar uma secao na pagina de Branding (Settings) para que usuarios master possam fazer upload de um icone personalizado para o PWA. O icone enviado sera salvo no storage e registrado no `app_settings`, e o manifest PWA sera atualizado dinamicamente.

### Como funciona

1. **Nova secao no BrandingSettingsCard**: Um campo de upload de imagem para o "Icone do App (PWA)" seguindo o mesmo padrao visual dos uploads de logo existentes.

2. **Upload e armazenamento**: A imagem sera enviada para o bucket `branding` no storage (mesmo bucket ja usado para logos), com o nome `pwa-icon-{timestamp}.png`.

3. **Nova chave em `app_settings`**: `pwa_icon_url` armazenara a URL publica do icone enviado.

4. **Manifest dinamico**: Em vez do manifest estatico no `vite.config.ts`, sera criado um arquivo `public/manifest.json` gerado/atualizado em runtime. Um hook ou script no `index.html` buscara a URL do icone das settings e atualizara as referencias.

5. **Abordagem simplificada**: Como o manifest PWA e definido em build time no Vite, a solucao mais pratica sera:
   - Permitir o upload do icone nas settings
   - Salvar a URL no `app_settings`
   - Atualizar os meta tags `apple-touch-icon` e `link[rel=icon]` dinamicamente via React (para o icone do iPhone/favicon)
   - Para o manifest completo do PWA, gerar um `/manifest.json` via edge function que le as settings do banco

### Detalhes tecnicos

**Arquivos modificados:**
- `src/components/settings/BrandingSettingsCard.tsx` -- Adicionar secao de upload do icone PWA
- `src/hooks/useBrandingSettings.ts` -- Adicionar campo `pwaIconUrl` e chave `pwa_icon_url`
- `src/App.tsx` ou `src/main.tsx` -- Aplicar meta tags dinamicas (apple-touch-icon, favicon) baseadas nas settings
- `vite.config.ts` -- Remover icones do manifest estatico (serao servidos dinamicamente)
- `index.html` -- Apontar manifest para a edge function

**Arquivos criados:**
- `supabase/functions/pwa-manifest/index.ts` -- Edge function que gera o `manifest.json` dinamicamente com os icones do banco

**Migracoes:**
- Inserir chave `pwa_icon_url` na tabela `app_settings` (ou apenas permitir upsert, ja que a tabela ja existe)

**Fluxo:**
1. Admin faz upload da imagem nas settings
2. Imagem e salva no storage bucket `branding`
3. URL e salva em `app_settings` com chave `pwa_icon_url`
4. O `apple-touch-icon` e favicon sao atualizados via React em tempo real
5. A edge function `/pwa-manifest` le a URL do banco e retorna um `manifest.json` com os icones corretos
6. Quando o usuario instala o PWA no iPhone, o icone personalizado aparece

