// Lista de domínios conhecidos do sistema
const KNOWN_DOMAINS = [
  'febracis.com.br',
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'yahoo.com.br',
  'live.com',
  'icloud.com',
];

/**
 * Calcula a distância de Levenshtein entre duas strings
 * (número mínimo de operações para transformar uma string na outra)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Inicializa primeira coluna
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Inicializa primeira linha
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Preenche a matriz
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export interface EmailSuggestion {
  originalEmail: string;
  suggestedEmail: string;
  originalDomain: string;
  suggestedDomain: string;
}

/**
 * Verifica se o email tem um domínio com erro de digitação e sugere correção
 * Retorna null se o domínio estiver correto ou se não encontrar sugestão
 */
export function suggestDomainCorrection(email: string): EmailSuggestion | null {
  if (!email || !email.includes('@')) return null;

  const [localPart, domain] = email.split('@');
  const lowerDomain = domain?.toLowerCase();

  if (!lowerDomain) return null;

  // Se o domínio já é conhecido, não há correção necessária
  if (KNOWN_DOMAINS.includes(lowerDomain)) return null;

  // Encontra o domínio mais próximo com distância <= 2
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const knownDomain of KNOWN_DOMAINS) {
    const distance = levenshteinDistance(lowerDomain, knownDomain);
    
    // Aceita distância máxima de 2 para sugerir correção
    if (distance <= 2 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = knownDomain;
    }
  }

  if (bestMatch) {
    return {
      originalEmail: email,
      suggestedEmail: `${localPart}@${bestMatch}`,
      originalDomain: lowerDomain,
      suggestedDomain: bestMatch,
    };
  }

  return null;
}

/**
 * Valida formato básico do email
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
