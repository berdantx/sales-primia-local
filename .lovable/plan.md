

## Plano: Corrigir Geolocalizacao de Leads

### Problema Identificado

O sistema esta apresentando dois problemas de geolocalizacao:

1. **"Local/Private"** - 7.746 leads mostrando esse valor como pais
2. **"Dublin, Ohio"** - ~11.937 leads incorretamente geolocalizados para servidores AWS

**Causa Raiz:**
- O ActiveCampaign frequentemente envia `127.0.0.1` (localhost) como IP do lead
- O codigo atual faz fallback para o IP da requisicao HTTP (servidor do ActiveCampaign)
- Esses servidores ficam em Dublin/Columbus, Ohio (AWS)
- O backfill marca IPs privados como "Local/Private"

| IP do Servidor AC | Leads Afetados |
|-------------------|----------------|
| 3.23.123.112 | 5.150 |
| 3.21.194.219 | 4.518 |
| 18.223.228.186 | 1.995 |
| 3.140.234.100 | 274 |

---

### Solucao

**Fase 1: Corrigir o webhook para novos leads**

Alterar `supabase/functions/leads-webhook/index.ts`:
- Remover o fallback para IP da requisicao
- Quando o payload contem IP invalido/privado, deixar ip_address como null
- A geolocalizacao retornara campos vazios (nao tentar geolocalizar)

**Antes (linhas 654-656):**
```typescript
const finalIpAddress = payloadIp && !isPrivateOrLocalIp(payloadIp)
  ? payloadIp
  : requestIp;  // PROBLEMA: usa IP do servidor AC
```

**Depois:**
```typescript
// So usa o IP do payload se for valido (nao privado/local)
// NAO fazer fallback para IP da requisicao (pode ser servidor de integracao)
const finalIpAddress = payloadIp && !isPrivateOrLocalIp(payloadIp)
  ? payloadIp
  : null;  // Deixar null quando IP nao identificado
```

---

**Fase 2: Corrigir o backfill para dados existentes**

Alterar `supabase/functions/backfill-geolocation/index.ts`:
- Mudar "Local/Private" para "Nao identificado"
- Adicionar deteccao de IPs conhecidos do ActiveCampaign para marcar como "Nao identificado"

**IPs conhecidos de servidores de integracao (ActiveCampaign/AWS Ohio):**
```typescript
const KNOWN_INTEGRATION_SERVER_IPS = [
  '3.23.123.112',
  '3.21.194.219', 
  '18.223.228.186',
  '3.140.234.100',
];
```

---

**Fase 3: Limpeza dos dados existentes**

Criar migration SQL para corrigir leads ja inseridos:

```sql
-- Corrigir "Local/Private" para "Nao identificado"
UPDATE leads 
SET country = 'Nao identificado',
    country_code = NULL,
    city = NULL,
    region = NULL
WHERE country = 'Local/Private';

-- Corrigir leads com IPs de servidores ActiveCampaign
UPDATE leads 
SET country = 'Nao identificado',
    country_code = NULL,
    city = NULL,
    region = NULL
WHERE ip_address IN ('3.23.123.112', '3.21.194.219', '18.223.228.186', '3.140.234.100');

-- Corrigir leads com IP 127.0.0.1 que ainda nao foram tratados
UPDATE leads 
SET country = 'Nao identificado',
    country_code = NULL,
    city = NULL,
    region = NULL,
    ip_address = NULL
WHERE ip_address = '127.0.0.1';
```

---

### Arquivos a Modificar

1. `supabase/functions/leads-webhook/index.ts` - Remover fallback de IP
2. `supabase/functions/backfill-geolocation/index.ts` - Usar "Nao identificado" e detectar IPs de integracao
3. Migration SQL - Corrigir dados existentes (~19.683 leads afetados)

---

### Resultado Esperado

- Novos leads sem IP valido terao pais = null (nao serao exibidos incorretamente)
- Leads existentes com "Local/Private" ou Dublin, Ohio serao corrigidos para "Nao identificado"
- O dashboard mostrara dados de geolocalizacao mais precisos

