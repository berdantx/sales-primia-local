// Country name normalization map (English -> Portuguese)
const countryMap: Record<string, string> = {
  'United States': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'US': 'Estados Unidos',
  'Germany': 'Alemanha',
  'Switzerland': 'Suíça',
  'Australia': 'Austrália',
  'France': 'França',
  'Spain': 'Espanha',
  'Italy': 'Itália',
  'Japan': 'Japão',
  'Canada': 'Canadá',
  'Mexico': 'México',
  'United Kingdom': 'Reino Unido',
  'UK': 'Reino Unido',
  'Netherlands': 'Países Baixos',
  'Belgium': 'Bélgica',
  'Sweden': 'Suécia',
  'Norway': 'Noruega',
  'Denmark': 'Dinamarca',
  'Ireland': 'Irlanda',
  'Austria': 'Áustria',
  'Poland': 'Polônia',
  'Czech Republic': 'República Tcheca',
  'South Korea': 'Coreia do Sul',
  'China': 'China',
  'India': 'Índia',
  'Argentina': 'Argentina',
  'Colombia': 'Colômbia',
  'Chile': 'Chile',
  'Peru': 'Peru',
  'Paraguay': 'Paraguai',
  'Uruguay': 'Uruguai',
  'New Zealand': 'Nova Zelândia',
  'South Africa': 'África do Sul',
};

const brasilVariants = ['Brasil', 'Brazil', 'BR'];

export function normalizeCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;
  return countryMap[trimmed] || trimmed;
}

export function isBrazil(country: string | null | undefined): boolean {
  if (!country) return false;
  return brasilVariants.includes(country.trim());
}
