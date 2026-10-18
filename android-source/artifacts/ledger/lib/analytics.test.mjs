import assert from 'node:assert/strict';
import test from 'node:test';
import { filterTransactionsByPeriod } from './analytics.ts';

const transactions = [
  { id: 'before-march', occurredAt: '2025-03-01T07:59:59.999Z' },
  { id: 'march-start', occurredAt: '2025-03-01T08:00:00.000Z' },
  { id: 'february', occurredAt: '2025-02-15T20:00:00.000Z' },
  { id: 'march-end', occurredAt: '2025-04-01T06:59:59.999Z' },
  { id: 'april-start', occurredAt: '2025-04-01T07:00:00.000Z' },
  { id: 'previous-year', occurredAt: '2024-12-15T20:00:00.000Z' },
  { id: 'older-year', occurredAt: '2023-06-15T19:00:00.000Z' },
];

const marchReference = new Date('2025-03-15T12:00:00-07:00');
const idsFor = (period, now = marchReference) =>
  filterTransactionsByPeriod(transactions, period, now).map(({ id }) => id);

test('month includes only current-month transactions, including local month-end', () => {
  assert.deepEqual(idsFor('MONTH'), ['march-start', 'march-end']);
});

test('year includes earlier months in the current local year and excludes previous years', () => {
  assert.deepEqual(idsFor('YEAR'), [
    'before-march',
    'march-start',
    'february',
    'march-end',
    'april-start',
  ]);
});

test('all time includes current, earlier, and previous-year transactions', () => {
  assert.deepEqual(idsFor('ALL'), transactions.map(({ id }) => id));
});

test('month and year boundaries follow local midnight at January 1', () => {
  const aroundNewYear = [
    { id: 'before-new-year', occurredAt: '2025-01-01T07:59:59.999Z' },
    { id: 'new-year', occurredAt: '2025-01-01T08:00:00.000Z' },
  ];
  const newYearReference = new Date('2025-01-01T12:00:00-08:00');

  assert.deepEqual(
    filterTransactionsByPeriod(aroundNewYear, 'MONTH', newYearReference).map(({ id }) => id),
    ['new-year'],
  );
  assert.deepEqual(
    filterTransactionsByPeriod(aroundNewYear, 'YEAR', newYearReference).map(({ id }) => id),
    ['new-year'],
  );
});
