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
