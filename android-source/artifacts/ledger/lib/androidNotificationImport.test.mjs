import assert from 'node:assert/strict';
import test from 'node:test';
import { isPotentialAndroidBankAlert } from './androidBankAlertFilter.ts';

const makeAlert = (title, text, packageName = 'com.android.messaging') => ({
  id: 'alert-1',
  title,
  text,
  packageName,
  receivedAt: '2026-10-18T10:00:00.000Z',
});

test('accepts structured alerts from known bank and payment app notifications', () => {
  assert.equal(
    isPotentialAndroidBankAlert(makeAlert('SBI Bank', 'Your A/C XX1234 is debited by Rs 250. UPI Ref 123456789012')),
    true,
  );
  assert.equal(
    isPotentialAndroidBankAlert(makeAlert('Payment alert', 'UPI transaction: ₹250 paid to Store', 'com.google.android.apps.nbu.paisa.user')),
    true,
  );
});

test('does not queue ordinary, promotional, or invalid notifications', () => {
  assert.equal(isPotentialAndroidBankAlert(makeAlert('Messages', 'Your package is out for delivery')), false);
  assert.equal(isPotentialAndroidBankAlert(makeAlert('HDFC Bank', 'Your OTP is 123456')), false);
  assert.equal(isPotentialAndroidBankAlert(makeAlert('SBI Bank', 'Special offer on your account')), false);
  assert.equal(
    isPotentialAndroidBankAlert({ ...makeAlert('SBI Bank', 'A/C debited Rs 250'), receivedAt: 'not-a-date' }),
    false,
  );
  assert.equal(isPotentialAndroidBankAlert({ ...makeAlert('SBI Bank', 'A/C debited Rs 250'), id: '' }), false);
  assert.equal(
    isPotentialAndroidBankAlert(makeAlert(
      'ICICI Bank',
      'Congratulations on activating ICICI Bank iMobile! As a security measure, txn limit for first 24 hours is Rs 10,000.',
    )),
    false,
  );
});

test('allows an uncertain but bank-related alert to reach the review parser', () => {
  assert.equal(
    isPotentialAndroidBankAlert(makeAlert('Bank alert', 'A/C XX1234 transaction notification; amount unavailable')),
    true,
  );
});
