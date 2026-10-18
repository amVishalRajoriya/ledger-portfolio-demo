export interface AndroidBankAlert {
  id: string;
  title: string;
  text: string;
  packageName: string;
  receivedAt: string;
}

const transactionWords = /\b(?:debit(?:ed)?|credit(?:ed)?|spent|paid|purchase(?:d)?|withdrawn|charged|received|refund(?:ed)?|reversal|cashback|transaction(?:\s+alert)?|txn)\b/i;
const bankEvidence = /\b(?:bank|a\/c|account|card|upi|neft|imps|rtgs|nfs|atm|pos|nach|ecs|ach|rrn|ref(?:erence)?)\b/i;
const amountOrDue = /(?:₹|INR|Rs\.?)\s*[\d,]+(?:\.\d{1,2})?|\bamount\s+due\b|\bavailable\s+limit\b/i;
const nonTransactionNotice = /\b(?:\bOTP\b|one[- ]time password|KYC|pre[- ]approved|eligible for|festive season|reward points|statement generated|offer|cashback request.*(?:processing|processed)|will be debited|will be deducted|to be debited|(?:txn|transaction|purchase)\s+declined|failed transaction|refund initiated|mandate\s+(?:created|registered|setup))\b/i;

export function isPotentialAndroidBankAlert(alert: AndroidBankAlert): boolean {
  if (
    !alert ||
    typeof alert.id !== 'string' ||
    !alert.id ||
    typeof alert.text !== 'string' ||
    !alert.text.trim() ||
    typeof alert.title !== 'string' ||
    typeof alert.packageName !== 'string' ||
    typeof alert.receivedAt !== 'string' ||
    !Number.isFinite(Date.parse(alert.receivedAt)) ||
    nonTransactionNotice.test(`${alert.title}\n${alert.text}`)
  ) return false;

  const source = `${alert.title} ${alert.packageName}`;
  const content = `${alert.title}\n${alert.text}`;
  const recognizableBankSource =
    /\b(?:bank|sbi|state\s+bank|hdfc|icici|axis|kotak|canara|bob|pnb|yes\s+bank|indusind|idfc|federal|paytm|phonepe|google\s*pay|gpay|bhim|cred|mobikwik|amazon\s*pay|slice|jupiter)\b/i.test(source);
  const hasBankEvidence = bankEvidence.test(content);
  const hasTransactionSignal = transactionWords.test(content);
  const hasCardUpdateSignal = /\b(?:amount\s+due|available\s+limit)\b/i.test(content);
  const hasMoney = amountOrDue.test(content);

  return (
    (recognizableBankSource && (hasTransactionSignal || hasCardUpdateSignal || hasMoney && hasBankEvidence)) ||
    (hasBankEvidence && hasTransactionSignal)
  );
}
