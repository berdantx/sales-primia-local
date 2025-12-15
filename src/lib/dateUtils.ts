import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Offset de Brasília: -3 horas (GMT-3)
const BRASILIA_OFFSET_HOURS = -3;

/**
 * Retorna a data/hora atual em Brasília (GMT-3)
 */
export function nowBrasilia(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (BRASILIA_OFFSET_HOURS * 3600000));
}

/**
 * Converte uma data para o horário de Brasília
 */
export function toBrasilia(date: Date): Date {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (BRASILIA_OFFSET_HOURS * 3600000));
}

/**
 * Retorna o início do dia em Brasília (00:00:00 BRT)
 * Convertido para UTC para uso em queries de banco
 */
export function startOfDayBrasiliaUTC(date?: Date): Date {
  const d = date ? toBrasilia(date) : nowBrasilia();
  // Início do dia em Brasília: 00:00 BRT = 03:00 UTC
  return new Date(Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    -BRASILIA_OFFSET_HOURS, // +3 hours to convert BRT 00:00 to UTC
    0, 0, 0
  ));
}

/**
 * Retorna o fim do dia em Brasília (23:59:59.999 BRT)
 * Convertido para UTC para uso em queries de banco
 */
export function endOfDayBrasiliaUTC(date?: Date): Date {
  const d = date ? toBrasilia(date) : nowBrasilia();
  // Fim do dia em Brasília: 23:59:59 BRT = 02:59:59 UTC do dia seguinte
  return new Date(Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + 1,
    -BRASILIA_OFFSET_HOURS - 1, // +2 hours (03:00 - 1 hour) = 02:59
    59, 59, 999
  ));
}

/**
 * Formata uma data em português brasileiro
 */
export function formatDateBR(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ptBR });
}

/**
 * Formata uma data apenas com dia/mês/ano
 */
export function formatDateOnlyBR(date: Date | string): string {
  return formatDateBR(date, 'dd/MM/yyyy');
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
