import { differenceInDays, differenceInWeeks, differenceInMonths, startOfDay, endOfDay, isAfter, isBefore, parseISO } from 'date-fns';

export interface Goal {
  id: string;
  name: string;
  target_value: number;
  currency: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface GoalProgress {
  totalSold: number;
  remaining: number;
  progressPercent: number;
  daysRemaining: number;
  weeksRemaining: number;
  monthsRemaining: number;
  perDay: number;
  perWeek: number;
  perMonth: number;
  isOnTrack: boolean;
  expectedByNow: number;
}

export function calculateGoalProgress(
  goal: Goal,
  totalSoldInCurrency: number
): GoalProgress {
  const today = startOfDay(new Date());
  const startDate = startOfDay(parseISO(goal.start_date));
  const endDate = endOfDay(parseISO(goal.end_date));
  
  const remaining = Math.max(0, goal.target_value - totalSoldInCurrency);
  const progressPercent = goal.target_value > 0 
    ? Math.min(100, (totalSoldInCurrency / goal.target_value) * 100)
    : 0;
  
  // Calculate time remaining
  const daysRemaining = Math.max(0, differenceInDays(endDate, today));
  const weeksRemaining = Math.max(0, Math.ceil(daysRemaining / 7));
  const monthsRemaining = Math.max(0, differenceInMonths(endDate, today) + 1);
  
  // Calculate what's needed per period
  const perDay = daysRemaining > 0 ? remaining / daysRemaining : remaining;
  const perWeek = weeksRemaining > 0 ? remaining / weeksRemaining : remaining;
  const perMonth = monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
  
  // Calculate if on track
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const expectedByNow = totalDays > 0 
    ? (goal.target_value * daysElapsed) / totalDays
    : goal.target_value;
  const isOnTrack = totalSoldInCurrency >= expectedByNow;
  
  return {
    totalSold: totalSoldInCurrency,
    remaining,
    progressPercent,
    daysRemaining,
    weeksRemaining,
    monthsRemaining,
    perDay,
    perWeek,
    perMonth,
    isOnTrack,
    expectedByNow,
  };
}

export function formatCurrency(value: number, currency: string = 'BRL'): string {
  // Validate currency code - must be 3 uppercase letters
  const validCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'BRL';
  const locale = validCurrency === 'BRL' ? 'pt-BR' : validCurrency === 'EUR' ? 'de-DE' : 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback if currency is still invalid
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
