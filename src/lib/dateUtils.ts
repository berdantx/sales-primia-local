import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Retorna os componentes da data/hora atual em Brasília usando Intl.DateTimeFormat
 * Isso garante consistência independente do timezone do navegador
 */
function getBrasiliaComponents(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second')
  };
}

/**
 * Retorna a data/hora atual em Brasília (America/Sao_Paulo)
 * Usa Intl.DateTimeFormat para garantir consistência independente do timezone do navegador
 */
export function nowBrasilia(): Date {
  const c = getBrasiliaComponents(new Date());
  return new Date(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
}

/**
 * Converte uma data para o horário de Brasília
 * Usa Intl.DateTimeFormat para garantir consistência independente do timezone do navegador
 */
export function toBrasilia(date: Date): Date {
  const c = getBrasiliaComponents(date);
  return new Date(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
}

/**
 * Retorna o início do dia em Brasília (00:00:00 BRT)
 * Convertido para UTC para uso em queries de banco
 */
export function startOfDayBrasiliaUTC(date?: Date): Date {
  const c = getBrasiliaComponents(date || new Date());
  // Início do dia em Brasília: 00:00 BRT = 03:00 UTC
  return new Date(Date.UTC(c.year, c.month - 1, c.day, 3, 0, 0, 0));
}

/**
 * Retorna o fim do dia em Brasília (23:59:59.999 BRT)
 * Convertido para UTC para uso em queries de banco
 */
export function endOfDayBrasiliaUTC(date?: Date): Date {
  const c = getBrasiliaComponents(date || new Date());
  // Fim do dia em Brasília: 23:59:59 BRT = 02:59:59 UTC do dia seguinte
  return new Date(Date.UTC(c.year, c.month - 1, c.day + 1, 2, 59, 59, 999));
}

/**
 * Retorna o intervalo de datas para um período em dias, considerando o timezone de Brasília
 * Útil para filtros de "Últimos X dias"
 */
export function getDateRangeBrasiliaUTC(days: number): { startDate: Date; endDate: Date } {
  const now = new Date();
  const c = getBrasiliaComponents(now);
  
  // Criar data de Brasília "hoje" para subtrair dias corretamente
  const todayBrasilia = new Date(c.year, c.month - 1, c.day);
  const startDateBrasilia = subDays(todayBrasilia, days);
  
  // Data de início: X dias atrás, às 00:00 BRT convertido para UTC (03:00 UTC)
  const startDate = new Date(Date.UTC(
    startDateBrasilia.getFullYear(),
    startDateBrasilia.getMonth(),
    startDateBrasilia.getDate(),
    3, 0, 0, 0
  ));
  
  // Data de fim: hoje às 23:59:59 BRT convertido para UTC (02:59:59 UTC do dia seguinte)
  const endDate = new Date(Date.UTC(
    c.year, c.month - 1, c.day + 1,
    2, 59, 59, 999
  ));
  
  return { startDate, endDate };
}

/**
 * Formata uma data em português brasileiro
 */
export function formatDateBR(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ptBR });
}

/**
 * Formata uma data ISO (UTC do banco) para exibição no horário de Brasília
 * Use esta função para exibir datas armazenadas em UTC convertidas para BRT
 * 
 * Usa Intl.DateTimeFormat com timezone fixo para garantir consistência
 * independente do timezone do navegador do usuário
 */
export function formatDateTimeBR(date: Date | string | null | undefined, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  if (!date) return '-';
  
  let d: Date;
  if (typeof date === 'string') {
    // Tentar múltiplos formatos de parsing
    // Formato Supabase: "2026-01-19 02:28:53.002118+00"
    let normalizedDate = date;
    
    // 1. Substituir espaço por T
    normalizedDate = normalizedDate.replace(' ', 'T');
    
    // 2. Corrigir timezone offset abreviado: +00 → +00:00
    // Regex para detectar offset sem os minutos (e.g., +00, -03)
    normalizedDate = normalizedDate.replace(/([+-])(\d{2})$/, '$1$2:00');
    
    d = parseISO(normalizedDate);
    
    // Se ainda inválido, tentar criar Date diretamente
    if (isNaN(d.getTime())) {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  
  // Verificar se é uma data válida
  if (isNaN(d.getTime())) return '-';
  
  // Usar Intl.DateTimeFormat com timezone fixo de Brasília
  // Isso garante que a formatação seja consistente independente do navegador
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  
  // Criar uma data "virtual" com os componentes de Brasília para usar com date-fns format
  const brasiliaDate = new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  );
  
  return format(brasiliaDate, formatStr, { locale: ptBR });
}

/**
 * Formata uma data apenas com dia/mês/ano
 */
export function formatDateOnlyBR(date: Date | string): string {
  return formatDateBR(date, 'dd/MM/yyyy');
}

/**
 * Formata uma data ISO (UTC) para exibição em UTC (para tooltip técnico)
 */
export function formatDateTimeUTC(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  // Formata diretamente em UTC
  return format(d, formatStr, { locale: ptBR }) + ' UTC';
}

/**
 * Retorna a data atual em Brasília no formato YYYY-MM-DD (para queries SQL)
 */
export function todayBrasiliaISO(): string {
  const d = nowBrasilia();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
