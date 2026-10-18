import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBankMessage } from './ledger.ts';

const receiveTime = '2025-05-19T12:00:00.000Z';

test('a bare debit amount is not accepted as a bank transaction', () => {
  const result = parseBankMessage('Debit ₹100', '', receiveTime);
  const withUnverifiedSender = parseBankMessage('Debit ₹100', 'VM-TEST-S', receiveTime);

  assert.equal(result.kind, 'rejected');
  assert.equal(result.kind === 'rejected' && result.manualEntry, true);
  assert.equal(withUnverifiedSender.kind, 'rejected');
  assert.equal(withUnverifiedSender.kind === 'rejected' && withUnverifiedSender.manualEntry, true);
});

test('a structured alert from an unlisted bank sender still parses', () => {
  const result = parseBankMessage(
    'Dear Customer, Your A/C XXXXX616007 has a debit by transfer of Rs 236.00 on 19/05/25. Avl Bal Rs 2,369.00.-SBI',
    '',
    receiveTime,
  );

  assert.equal(result.kind, 'transaction');
  if (result.kind !== 'transaction') return;
  assert.equal(result.transaction.amount, 236);
  assert.equal(result.transaction.accountTail, '616007');
  assert.equal(result.institution, 'SBI');
});

test('an unknown-bank alert with account and balance details remains supported', () => {
  const result = parseBankMessage(
    'Your A/C XX1234 has been debited by Rs 100.00 on 19/05/25 at 10:20. Available balance Rs 500.00.',
    'VM-XYZBNK-S',
    receiveTime,
  );

  assert.equal(result.kind, 'transaction');
  if (result.kind !== 'transaction') return;
  assert.equal(result.transaction.amount, 100);
  assert.equal(result.transaction.accountTail, '1234');
});

test('a credit-card instrument is not mistaken for a credit transaction direction', () => {
  const result = parseBankMessage(
    'Amount Spent: Rs.149 with HDFC Bank Credit Card 0671 at YOUTUBE on 2026-10-18. This transaction was completed without additional authentication mandated by RBI.',
    'AD-HDFCBK-S',
    '2026-10-18T14:28:47.000Z',
  );

  assert.equal(result.kind, 'transaction');
  if (result.kind !== 'transaction') return;
  assert.equal(result.transaction.direction, 'DEBIT');
  assert.equal(result.transaction.amount, 149);
  assert.equal(result.transaction.accountTail, '0671');
});

test('bank activation congratulations with a transaction limit are rejected', () => {
  const result = parseBankMessage(
    'Congratulations on activating ICICI Bank iMobile! If not activated, call 18001080. As a security measure, txn limit for first 24 hours is Rs 10,000.',
    'AD-ICICIT-S',
    '2026-10-17T14:00:00.000Z',
  );

  assert.equal(result.kind, 'rejected');
  assert.match(result.reason, /activation|transaction-limit/i);
});

test('a completed AutoPay mandate debit is a transaction, not a setup notice', () => {
  const result = parseBankMessage(
    'Your A/C XX1234 has been debited by Rs 850.00 for AutoPay mandate on 18/10/2026. UTR 123456789012.',
    'AD-ICICIB-S',
    '2026-10-18T12:00:00.000Z',
  );

  assert.equal(result.kind, 'transaction');
  if (result.kind !== 'transaction') return;
  assert.equal(result.transaction.direction, 'DEBIT');
  assert.equal(result.transaction.channel, 'AUTO_DEBIT');
});

test('review can explicitly confirm direction when both action words are present', () => {
  const message = 'Your A/C XX1234 was debited and credited Rs 100.00 on 19/05/25.';
  const ambiguous = parseBankMessage(message, 'VM-XYZBNK-S', receiveTime);
  const confirmed = parseBankMessage(message, 'VM-XYZBNK-S', receiveTime, [], 'DEBIT');

  assert.equal(ambiguous.kind, 'review');
  assert.equal(confirmed.kind, 'transaction');
  if (confirmed.kind !== 'transaction') return;
  assert.equal(confirmed.transaction.direction, 'DEBIT');
});
