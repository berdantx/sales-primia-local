

## Botao de Login visivel no mobile + PWA com icone para iPhone

### Problema atual
1. O botao "Entrar" na landing page esta escondido no mobile (`hidden sm:flex`) -- usuarios no iPhone nao conseguem ver o botao de login.
2. O app nao esta configurado como PWA, entao nao pode ser "instalado" na tela inicial do iPhone com um icone proprio.

### O que sera feito

#### 1. Tornar o botao de login visivel no mobile
- Remover a classe `hidden sm:flex` do botao "Entrar" na landing page
- Ajustar o layout do header para que tanto "Entrar" quanto "Tenho Interesse" fiquem visiveis em telas pequenas (com tamanhos reduzidos no mobile)

#### 2. Configurar PWA (Progressive Web App)
Isso permitira que voce "instale" o app no iPhone como se fosse um aplicativo nativo, com icone na tela inicial.

- Instalar o plugin `vite-plugin-pwa`
- Configurar o `vite.config.ts` com manifest PWA (nome, icones, cores, etc.)
- Adicionar meta tags no `index.html` para compatibilidade com iOS (apple-touch-icon, apple-mobile-web-app-capable, etc.)
- Criar icones PWA (192x192 e 512x512) no diretorio `public/` usando o favicon atual como base
- Criar um service worker para funcionalidade offline basica

### Detalhes tecnicos

**Arquivos modificados:**
- `src/pages/LandingPage.tsx` -- tornar botao "Entrar" visivel no mobile
- `vite.config.ts` -- adicionar plugin PWA com configuracao de manifest
- `index.html` -- adicionar meta tags para iOS (apple-touch-icon, apple-mobile-web-app-capable, viewport, status-bar)
- `package.json` -- adicionar dependencia `vite-plugin-pwa`

**Arquivos criados:**
- `public/pwa-192x192.png` -- icone 192x192 para PWA
- `public/pwa-512x512.png` -- icone 512x512 para PWA
- `public/apple-touch-icon.png` -- icone 180x180 para iPhone

**Manifest PWA:**
- Nome: "Launch Pocket"
- Nome curto: "Launch Pocket"
- Cor do tema: cor primaria do app
- Display: standalone (sem barra de navegacao do browser)
- Start URL: "/"

**Para instalar no iPhone:**
Apos a implementacao, basta abrir o site no Safari, tocar em "Compartilhar" e depois "Adicionar a Tela de Inicio". O app aparecera com o icone configurado.
