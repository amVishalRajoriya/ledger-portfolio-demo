import type { Transaction } from '@/lib/ledger';

export interface Totals {
  income: number;
  expenses: number;
  net: number;
}

export type TransactionPeriod = 'MONTH' | 'YEAR' | 'ALL';

export const transactionPeriods: Array<{ value: TransactionPeriod; label: string }> = [
  { value: 'MONTH', label: 'This month' },
  { value: 'YEAR', label: 'This year' },
  { value: 'ALL', label: 'All time' },
];

export function transactionPeriodLabel(period: TransactionPeriod): string {
  return transactionPeriods.find((item) => item.value === period)?.label ?? 'All time';
}

export function filterTransactionsByPeriod<T extends Pick<Transaction, 'occurredAt'>>(
  items: T[],
  period: TransactionPeriod,
  now = new Date(),
): T[] {
  if (period === 'ALL') return [...items];
  return items.filter((item) => {
    const date = new Date(item.occurredAt);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== now.getFullYear()) return false;
    return period === 'YEAR' || date.getMonth() === now.getMonth();
  });
}

export function isSameMonth(iso: string, year: number, month: number): boolean {
  const date = new Date(iso);
  return date.getFullYear() === year && date.getMonth() === month;
}

export function totalsFor(items: Transaction[]): Totals {
  const income = items.reduce((sum, item) =>
    sum + (item.direction === 'CREDIT' && !item.isExcludedFromTotals && item.channel !== 'REVERSAL' ? item.amount : 0), 0);
  const debits = items.reduce((sum, item) =>
    sum + (item.direction === 'DEBIT' && !item.isExcludedFromTotals ? item.amount : 0), 0);
  const refunds = items.reduce((sum, item) =>
    sum + (item.direction === 'CREDIT' && item.channel === 'REVERSAL' ? item.amount : 0), 0);
  const expenses = Math.max(0, debits - refunds);
  return { income, expenses, net: income - expenses };
}

export function inPeriod(item: Transaction, start: Date, end: Date): boolean {
  const timestamp = new Date(item.occurredAt).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

export function monthTransactions(items: Transaction[], year: number, month: number): Transaction[] {
  return items.filter((item) => isSameMonth(item.occurredAt, year, month));
}

export function monthlySpend(items: Transaction[], year: number, month: number, throughDay?: number): number {
  const filtered = monthTransactions(items, year, month).filter((item) =>
    throughDay === undefined || new Date(item.occurredAt).getDate() <= throughDay,
  );
  return totalsFor(filtered).expenses;
}

export function categorySpend(items: Transaction[]): Array<{ categoryId: string; amount: number }> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.direction === 'DEBIT' && !item.isExcludedFromTotals) {
      totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amount);
    } else if (item.direction === 'CREDIT' && item.channel === 'REVERSAL') {
      const original = items.find((candidate) => candidate.id === item.linkedTransactionId)
        ?? items.find((candidate) => {
          const age = new Date(item.occurredAt).getTime() - new Date(candidate.occurredAt).getTime();
          return candidate.direction === 'DEBIT' &&
            candidate.amount === item.amount &&
            candidate.merchantNormalized === item.merchantNormalized &&
            age >= 0 && age < 90 * 86400000;
        });
      if (original) totals.set(original.categoryId, (totals.get(original.categoryId) ?? 0) - item.amount);
    }
  }
  return [...totals].map(([categoryId, amount]) => ({ categoryId, amount: Math.max(0, amount) }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
