export type Direction = 'DEBIT' | 'CREDIT';
export type Instrument =
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_ACCOUNT'
  | 'UPI'
  | 'WALLET'
  | 'LOAN'
  | 'UPI_LITE';
export type Channel =
  | 'UPI'
  | 'POS'
  | 'ECOM'
  | 'ATM'
  | 'NEFT'
  | 'IMPS'
  | 'RTGS'
  | 'AUTO_DEBIT'
  | 'CHEQUE'
  | 'CASH'
  | 'FEE'
  | 'REVERSAL'
  | 'OTHER';
export type LinkType =
  | 'TRANSFER_PAIR'
  | 'CARD_PAYMENT'
  | 'REVERSAL'
  | 'REIMBURSEMENT';
export type MessageStatus =
  | 'PARSED'
  | 'NEEDS_REVIEW'
  | 'PROMOTIONAL'
  | 'REJECTED_NON_TXN'
  | 'DUPLICATE'
  | 'IGNORED';

export interface Category {
  id: string;
  name: string;
  icon: string;
  tint: number;
  isIncome?: boolean;
}

export interface Account {
  id: string;
  institutionId: string;
  institution: string;
  displayName: string;
  instrumentType: Instrument;
  accountTail: string;
  creditLimit?: number;
  availableLimit?: number;
  dueAmount?: number;
  dueDate?: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  institutionId?: string;
  accountId?: string;
  accountTail?: string;
  amount: number;
  direction: Direction;
  occurredAt: string;
  instrument: Instrument;
  channel: Channel;
  merchantRaw: string;
  merchantNormalized: string;
  categoryId: string;
  note?: string;
  referenceNumber?: string;
  linkedTransactionId?: string;
  linkType?: LinkType;
  isExcludedFromTotals: boolean;
  isUserVerified: boolean;
  sourceMessageId?: string;
  contentHash?: string;
}

export interface RawMessage {
  id: string;
  contentHash: string;
  body: string;
  sender: string;
  receivedAt: string;
  status: MessageStatus;
  rejectReason?: string;
  transactionId?: string;
}

export interface ReviewItem {
  id: string;
  rawMessageId?: string;
  body: string;
  sender: string;
  receivedAt: string;
  reason: string;
  parsedAmount?: number;
}

export interface UserRule {
  id: string;
  merchantPrefix: string;
  categoryId: string;
}

export interface LedgerState {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  rules: UserRule[];
  reviews: ReviewItem[];
  rawMessages: RawMessage[];
  demoMode: boolean;
  fyMode: boolean;
  lastMessageAt?: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'coffee', tint: 1 },
  { id: 'groceries', name: 'Groceries', icon: 'shopping-cart', tint: 2 },
  { id: 'transport', name: 'Transport & Fuel', icon: 'navigation', tint: 3 },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', tint: 4 },
  { id: 'bills', name: 'Bills & Utilities', icon: 'zap', tint: 5 },
  { id: 'home', name: 'Rent & Housing', icon: 'home', tint: 6 },
  { id: 'health', name: 'Health & Medical', icon: 'heart', tint: 7 },
  { id: 'entertainment', name: 'Entertainment', icon: 'play-circle', tint: 3 },
  { id: 'travel', name: 'Travel', icon: 'map', tint: 2 },
  { id: 'education', name: 'Education', icon: 'book-open', tint: 4 },
  { id: 'investments', name: 'Investments', icon: 'trending-up', tint: 5 },
  { id: 'insurance', name: 'Insurance', icon: 'shield', tint: 6 },
  { id: 'emi', name: 'EMI & Loans', icon: 'layers', tint: 7 },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', tint: 1 },
  { id: 'cash', name: 'Cash Withdrawal', icon: 'credit-card', tint: 2 },
  { id: 'bank-charges', name: 'Bank Charges', icon: 'briefcase', tint: 3 },
  { id: 'rewards', name: 'Rewards & Cashback', icon: 'gift', tint: 5 },
  { id: 'card-payment', name: 'Credit Card Payment', icon: 'credit-card', tint: 4 },
  { id: 'transfers', name: 'Transfers', icon: 'repeat', tint: 6 },
  { id: 'salary', name: 'Salary', icon: 'briefcase', tint: 1, isIncome: true },
  { id: 'other-income', name: 'Other Income', icon: 'plus-circle', tint: 3, isIncome: true },
  { id: 'uncategorised', name: 'Uncategorised', icon: 'help-circle', tint: 7 },
];

export const BANKS = [
  { id: 'icici_bank', name: 'ICICI Bank', senders: ['ICICIB', 'ICICIT'] },
  { id: 'canara_bank', name: 'Canara Bank', senders: ['CANBNK', 'CANARA', 'CANBK'] },
  { id: 'hdfc_cards', name: 'HDFC Bank', senders: ['HDFCBK', 'HDFCBN'] },
];

export const EMPTY_STATE: LedgerState = {
  transactions: [],
  accounts: [],
  categories: DEFAULT_CATEGORIES,
  rules: [],
  reviews: [],
  rawMessages: [],
  demoMode: false,
  fyMode: false,
};

const merchantCategories: Array<[string[], string]> = [
  [['SWIGGY', 'ZOMATO', 'HUNGERBOX', 'EAT GOOD'], 'food'],
  [['BIGBASKET', 'BLINKIT', 'ZEPTO', 'DMART', 'D MART'], 'groceries'],
  [['UBER', 'OLA', 'RAPIDO', 'IRCTC'], 'transport'],
  [['AMAZON', 'FLIPKART', 'MYNTRA', 'AJIO'], 'shopping'],
  [['JIO', 'AIRTEL', 'BESCOM', 'ELECTRICITY'], 'bills'],
  [['NETFLIX', 'SPOTIFY', 'YOUTUBE', 'CANVA', 'HOTSTAR'], 'subscriptions'],
  [['MAKE MY TRIP', 'MAKEMYTRIP'], 'travel'],
];

export function makeId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeSender(sender: string): string {
  return sender
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^[A-Z]{2}-/i, '')
    .replace(/-[A-Z]$/i, '')
    .toUpperCase();
}

export function identifyBank(sender: string, body = ''): (typeof BANKS)[number] | undefined {
  const normalized = normalizeSender(sender);
  const bySender = BANKS.find((bank) => bank.senders.includes(normalized));
  if (bySender) return bySender;
  const haystack = body.toUpperCase();
  return BANKS.find((bank) => haystack.includes(bank.name.toUpperCase()));
}

export function normalizeMerchant(raw: string): string {
  let value = raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}(?:[A-Z ]+)?\s+(?:IN|INDIA)$/i, '')
    .trim()
    .replace(/^[._\s]+|[._\s]+$/g, '');
  value = value.replace(/^(?:AGG|RAZ|PHICOM)\*\s*/i, '');
  const parts = value.split(/\*\s*/).filter(Boolean);
  if (parts.length > 1) {
    const left = parts[0].trim();
    const right = parts.slice(1).join(' ').trim();
    value = /\d/.test(right) && !/\d/.test(left) ? left : right;
  }
  value = value.replace(/\s+[A-Z0-9]*\d[A-Z0-9-]*$/i, '').trim();
  return value.replace(/^[._\s]+|[._\s]+$/g, '').replace(/\s+/g, ' ').toUpperCase();
}

export function categorizeMerchant(
  merchant: string,
  channel: Channel,
  direction: Direction,
  rules: UserRule[] = [],
): string {
  const normalized = normalizeMerchant(merchant);
  const rule = rules.find((item) => normalized.startsWith(item.merchantPrefix.toUpperCase()));
  if (rule) return rule.categoryId;
  for (const [aliases, categoryId] of merchantCategories) {
    if (aliases.some((alias) => normalized.startsWith(alias))) return categoryId;
  }
  if (direction === 'CREDIT') return 'other-income';
  if (channel === 'ATM' || channel === 'CASH') return 'cash';
  if (channel === 'AUTO_DEBIT') return 'emi';
  if (channel === 'FEE') return 'bank-charges';
  return 'uncategorised';
}

export function formatRupees(value: number, compact = false): string {
  const absolute = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: compact ? 0 : absolute % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(absolute);
  return `${value < 0 ? '−' : ''}₹${formatted}`;
}

export function monthLabel(date: Date, short = false): string {
  return date.toLocaleDateString('en-IN', { month: short ? 'short' : 'long', year: 'numeric' });
}

export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function localDateInput(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localDateKey(iso: string): string {
  return localDateInput(new Date(iso));
}

export function suffixMatch(left = '', right = ''): number {
  const a = left.replace(/\D/g, '');
  const b = right.replace(/\D/g, '');
  let length = 0;
  while (length < a.length && length < b.length && a[a.length - 1 - length] === b[b.length - 1 - length]) length++;
  return length;
}

function parseAmount(raw: string): number | undefined {
  const amount = Number(raw.replace(/,/g, ''));
  return Number.isFinite(amount) && amount >= 0.01 ? amount : undefined;
}

function explicitMessageDate(text: string): Date | undefined {
  const iso = text.match(/\b(?:on|date|dated)\s*:?\s*(\d{4})-(\d{1,2})-(\d{1,2})\b/i);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const match = text.match(/\b(?:on|date|dated)\s*:?\s*(\d{1,2})[/-]([A-Z]{3}|\d{1,2})[/-](\d{2,4})\b/i);
  if (!match) return undefined;
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const month = /^[A-Z]{3}$/i.test(match[2]) ? months[match[2].toUpperCase()] : Number(match[2]) - 1;
  let year = Number(match[3]);
  if (year < 100) year += year < 70 ? 2000 : 1900;
  if (month < 0 || month > 11) return undefined;
  const date = new Date(year, month, Number(match[1]), 12);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function receivedDateMismatch(text: string, receivedAt: string): boolean {
  const bodyDate = explicitMessageDate(text);
  const received = new Date(receivedAt);
  if (!bodyDate || Number.isNaN(received.getTime())) return false;
  return Math.abs(bodyDate.getTime() - received.getTime()) > 36 * 60 * 60 * 1000;
}

function firstMatch(text: string, patterns: RegExp[]): RegExpMatchArray | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return undefined;
}

function captureTail(text: string): string {
  const match = text.match(/(?:XX+|x+|card(?:\s+ending\s+with)?\s*)(\d{3,})/i)
    ?? text.match(/(?:Acct|Acc|Account|A\/C|a\/c)\s*(?:no\.?\s*)?(?:XX+|x+)?(\d{3,})/i);
  return match?.[1] ?? '';
}

function captureReference(text: string): string | undefined {
  return text.match(/(?:UPI\s*(?:Ref(?:erence)?(?:\s*no\.?)?)?|Ref(?:erence)?\s*(?:no\.?)?|RRN)\s*[:.]?\s*([A-Z0-9]{8,})/i)?.[1];
}

function captureMerchant(text: string, kind: string): string {
  const patterns: Record<string, RegExp[]> = {
    icici: [
      /Info:?\s*UPI\/[^/.\s]+\/(?:Payment to\s*)?([^.\n]+)/i,
      /(?:payment to|towards)\s+([^.\n;]+)/i,
      /;\s*([^.;]+?)\s+credited\b/i,
      /\bto\s+([A-Z][A-Z0-9 &._'-]{2,})(?:[,.;\n]|$)/i,
      /\bfrom\s+([A-Z][A-Z0-9 &._'-]{2,})(?:[,.;\n]|$)/i,
    ],
    canara: [
      /\bto\s+([A-Z][A-Z0-9 &._'-]{2,})(?:[,.;\n]|$)/i,
      /\bfrom\s+(?!a\/c)([A-Z][A-Z0-9 &._'-]{2,})(?:[,.;\n]|$)/i,
    ],
    hdfc: [
      /\bAt\s+(.+?)(?:\s+On\b|\.|$)/i,
      /\bby\s+(.+?)(?:\s{2,}|(?:\s+(?:BANGALORE|MUMBAI|DELHI)\b)|\bon\b|$)/i,
    ],
  };
  const match = firstMatch(text, patterns[kind] ?? []);
  return match?.[1]?.trim().replace(/(?:\.|,)+$/, '') ?? '';
}

export type ParseResult =
  | {
      kind: 'transaction';
      transaction: Omit<Transaction, 'id' | 'sourceMessageId' | 'contentHash'>;
      institution: string;
      accountTail: string;
      note?: string;
      warning?: string;
    }
  | {
      kind: 'card-update';
      institution: string;
      accountTail: string;
      dueAmount?: number;
      dueDate?: string;
      availableLimit?: number;
    }
  | { kind: 'review'; reason: string; parsedAmount?: number }
  | { kind: 'rejected'; reason: string; manualEntry?: boolean };

function parseGenericBankTransaction(
  text: string,
  receivedAt: string,
  institution: string,
  institutionId: string,
  rules: UserRule[],
  confirmedDirection?: Direction,
): ParseResult {
  const actions = Array.from(text.matchAll(/\b(debit(?:ed)?|credit(?:ed)?(?!\s+card\b)|spent|paid|purchase|purchased|withdrawn|charged|received|refund(?:ed)?|reversal|cashback)\b/gi));
  const debitAction = actions.find((match) => /^(?:debit(?:ed)?|spent|paid|purchase|purchased|withdrawn|charged)$/i.test(match[1]));
  const creditAction = actions.find((match) => /^(?:credit(?:ed)?|received|refund(?:ed)?|reversal|cashback)$/i.test(match[1]));
  if (!debitAction && !creditAction) {
    return { kind: 'review', reason: 'No clear debit or credit indicator was found.' };
  }
  if (debitAction && creditAction && !confirmedDirection) {
    return { kind: 'review', reason: 'The message contains both debit and credit wording. Confirm the transaction direction.' };
  }

  const amountTokens = Array.from(text.matchAll(/(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/gi));
  if (amountTokens.length === 0) {
    return { kind: 'review', reason: 'No currency amount could be safely identified.' };
  }

  const selectedAction = confirmedDirection === 'DEBIT'
    ? debitAction ?? creditAction
    : confirmedDirection === 'CREDIT'
      ? creditAction ?? debitAction
      : debitAction ?? creditAction;
  const actionIndex = selectedAction?.index ?? 0;
  const scoredAmounts = amountTokens.map((match) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const amount = parseAmount(match[1]);
    const nearby = `${text.slice(Math.max(0, start - 18), start)} ${text.slice(end, end + 18)}`;
    const balanceContext = /\b(?:balance|bal|available|limit|due)\b/i.test(nearby);
    const score = amount === undefined || balanceContext
      ? -1
      : 100 - Math.min(100, Math.abs(start - actionIndex));
    return { amount, score };
  }).filter((candidate): candidate is { amount: number; score: number } => candidate.amount !== undefined)
    .sort((a, b) => b.score - a.score);

  const bestAmount = scoredAmounts[0];
  if (!bestAmount || bestAmount.score < 35) {
    return { kind: 'review', reason: 'The message has an amount, but it could be a balance or limit rather than the transaction amount.' };
  }
  if (receivedDateMismatch(text, receivedAt)) {
    return {
      kind: 'review',
      reason: 'The date written in this message differs from its received date by more than 36 hours. Confirm the correct date.',
      parsedAmount: bestAmount.amount,
    };
  }

  const direction: Direction = debitAction && creditAction && confirmedDirection
    ? confirmedDirection
    : creditAction ? 'CREDIT' : 'DEBIT';
  const channel: Channel = /\bUPI\b/i.test(text) ? 'UPI'
    : /\b(?:NFS|ATM|cash withdrawal)\b/i.test(text) ? 'ATM'
    : /\bNEFT\b/i.test(text) ? 'NEFT'
    : /\bIMPS\b/i.test(text) ? 'IMPS'
    : /\bRTGS\b/i.test(text) ? 'RTGS'
    : /\b(?:NACH|AutoPay|mandate|standing instruction)\b/i.test(text) ? 'AUTO_DEBIT'
    : /\b(?:fee|charges|GST)\b/i.test(text) ? 'FEE'
    : /\b(?:POS|point of sale|swiped)\b/i.test(text) ? 'POS'
    : 'OTHER';
  const instrument: Instrument = /\bcredit\s+card\b/i.test(text) ? 'CREDIT_CARD'
    : /\bdebit\s+card\b/i.test(text) ? 'DEBIT_CARD'
    : /\bUPI\b/i.test(text) ? 'UPI'
    : /\bwallet\b/i.test(text) ? 'WALLET'
    : /\bloan\b/i.test(text) ? 'LOAN'
    : 'BANK_ACCOUNT';
  const merchantMatch = text.match(/\b(?:at|towards|merchant)\s+([A-Z0-9][A-Z0-9 &._'-]{2,}?)(?=\s+(?:on|via|ref|rrn|upi|txn|transaction|date|balance|bal|available)\b|[.,;\n]|$)/i)
    ?? text.match(/\bto\s+(?!your account\b|your a\/c\b|account\b|a\/c\b)([A-Z0-9][A-Z0-9 &._'-]{2,}?)(?=\s+(?:on|via|ref|rrn|upi|txn|transaction|date|balance|bal|available)\b|[.,;\n]|$)/i)
    ?? text.match(/\bfrom\s+(?!your account\b|your a\/c\b|account\b|a\/c\b)([A-Z0-9][A-Z0-9 &._'-]{2,}?)(?=\s+(?:on|via|ref|rrn|upi|txn|transaction|date|balance|bal|available)\b|[.,;\n]|$)/i);
  const rawMerchant = merchantMatch?.[1]?.trim() ?? '';
  const merchant = normalizeMerchant(rawMerchant);

  return {
    kind: 'transaction',
    institution,
    accountTail: captureTail(text),
    transaction: {
      institutionId,
      accountTail: captureTail(text),
      amount: bestAmount.amount,
      direction,
      occurredAt: receivedAt,
      instrument,
      channel,
      merchantRaw: rawMerchant || 'Unknown merchant',
      merchantNormalized: merchant,
      categoryId: categorizeMerchant(merchant, channel, direction, rules),
      referenceNumber: captureReference(text),
      isExcludedFromTotals: false,
      isUserVerified: false,
    },
  };
}

export function parseBankMessage(
  body: string,
  sender: string,
  receivedAt: string,
  rules: UserRule[] = [],
  confirmedDirection?: Direction,
): ParseResult {
  const text = body.trim();
  if (!text) return { kind: 'review', reason: 'Message is empty. Paste the complete bank alert.' };

  const negative: Array<[RegExp, string]> = [
    [/\b(?:will be debited|will be deducted|to be debited)\b/i, 'AutoPay notice — the actual debit should arrive separately.'],
    [/\b(?:txn|transaction|purchase)\s+declined\b/i, 'Declined payment — no money was spent.'],
    [/\bcashback request\b.*\b(?:processing|processed)\b/i, 'Cashback is pending, not received.'],
    [/\breward points credited\b/i, 'Reward points are not a rupee transaction.'],
    [/\bstatement generated\b/i, 'Statement notice without a transaction amount.'],
    [/\bAutoPay\b.*\b(?:success|successful)\b/i, 'AutoPay confirmation can duplicate the actual bank debit.'],
    [/\bmandate\b.*\b(?:created|registered|setup)\b/i, 'Mandate setup is not a payment.'],
    [/\b(?:failed|failure)\b/i, 'Failed transaction — no completed payment.'],
    [/\brefund initiated\b/i, 'Refund is pending; wait for the credit alert.'],
    [/\b(?:KYC|OTP|PIN reset|device registration|pre-approved|eligible for|offer|festive season)\b/i, 'Promotional or service message.'],
    [/\bcongratulations\b[\s\S]{0,240}\b(?:activat\w*|(?:txn|transaction)\s+limit)\b/i, 'Account activation or transaction-limit notice, not a completed transaction.'],
  ];
  const rejected = negative.find(([pattern]) => pattern.test(text));
  if (rejected) return { kind: 'rejected', reason: rejected[1] };

  const bank = identifyBank(sender, text);
  const embeddedSender = text.match(/(?:^|[.-])\s*([A-Z][A-Z0-9]{1,15})\s*$/i)?.[1];
  const senderLabel = normalizeSender(sender || embeddedSender || '');
  const institution = bank?.name ?? (senderLabel || 'Other bank');
  const institutionId = bank?.id ?? `sms_${(senderLabel || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const tail = captureTail(text);
  const amountToken = text.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1];
  const amountInText = amountToken ? parseAmount(amountToken) : undefined;

  if (bank?.id === 'hdfc_cards') {
    const due = text.match(/Amount\s+Due\s*(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?).*?\bPay\s+instantly\s+by\s+(\d{1,2}\/[A-Z]{3}\/\d{4})/i);
    if (due) {
      const [day, month, year] = due[2].toUpperCase().split('/');
      const monthNumber = explicitMessageDate(`date ${day}/${month}/${year}`)?.getMonth();
      if (monthNumber === undefined) return { kind: 'review', reason: 'The card due date could not be read safely.' };
      const dueDate = new Date(Number(year), monthNumber, Number(day), 12).toISOString();
      return { kind: 'card-update', institution, accountTail: tail, dueAmount: parseAmount(due[1]), dueDate };
    }
    const limit = text.match(/(?:AVAILABLE\s+LIMIT|Avl\s+Limit)\s*(?:is)?\s*(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (/\b(?:spent|without\s+OTP\/PIN)\b/i.test(text) && /\bHDFC\s+Bank\s+Card\b/i.test(text)) {
      const spend = firstMatch(text, [
        /\bSpent\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?).*?\bCard(?:\s+no)?\s*(?:x+)?(\d{3,}).*?\bAt\s+(.+?)(?:\s+On\b|\.|$)/i,
        /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)\s+without\s+OTP\/PIN.*?\bCard\s*(?:x+)?(\d{3,}).*?\bAt\s+(.+?)(?:\s+On\b|\.|$)/i,
        /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)\s+spent\s+on.*?\bCard\s*(?:x+)?(\d{3,}).*?\bat\s+(.+?)(?:\s+on\b|\.|$)/i,
      ]);
      if (spend) {
        const value = parseAmount(spend[1]);
        const merchant = normalizeMerchant(spend[3]);
        if (!value) return { kind: 'review', reason: 'Could not confirm the transaction amount.' };
        if (receivedDateMismatch(text, receivedAt)) {
          return { kind: 'review', reason: 'The date written in this message differs from its received date by more than 36 hours. Confirm the correct date.', parsedAmount: value };
        }
        return {
          kind: 'transaction',
          institution,
          accountTail: spend[2],
          transaction: {
            institutionId,
            accountTail: spend[2],
            amount: value,
            direction: 'DEBIT',
            occurredAt: receivedAt,
            instrument: 'CREDIT_CARD',
            channel: 'ECOM',
            merchantRaw: spend[3].trim(),
            merchantNormalized: merchant,
            categoryId: categorizeMerchant(merchant, 'ECOM', 'DEBIT', rules),
            isExcludedFromTotals: false,
            isUserVerified: false,
            referenceNumber: captureReference(text),
          },
        };
      }
    }
    const payment = text.match(/PAYMENT\s+OF\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)\s+RECEIVED\s+TOWARDS\s+YOUR\s+CREDIT\s+CARD/i);
    if (payment) {
      const value = parseAmount(payment[1]);
      if (value) {
        if (receivedDateMismatch(text, receivedAt)) {
          return { kind: 'review', reason: 'The date written in this message differs from its received date by more than 36 hours. Confirm the correct date.', parsedAmount: value };
        }
        return {
          kind: 'transaction',
          institution,
          accountTail: tail,
          transaction: {
            institutionId, accountTail: tail, amount: value, direction: 'CREDIT',
            occurredAt: receivedAt, instrument: 'CREDIT_CARD', channel: 'REVERSAL',
            merchantRaw: 'Card payment', merchantNormalized: 'CARD PAYMENT', categoryId: 'card-payment',
            isExcludedFromTotals: true, isUserVerified: false,
          },
        };
      }
    }
    const refund = text.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)\s+refunded\s+by\s+(.+?)(?:\s{2,}|\s+on\s+\d|$)/i);
    if (refund) {
      const value = parseAmount(refund[1]);
      const merchant = normalizeMerchant(refund[2]);
      if (value && receivedDateMismatch(text, receivedAt)) {
        return { kind: 'review', reason: 'The date written in this message differs from its received date by more than 36 hours. Confirm the correct date.', parsedAmount: value };
      }
      if (value) return {
        kind: 'transaction', institution, accountTail: tail,
        transaction: {
          institutionId, accountTail: tail, amount: value, direction: 'CREDIT',
          occurredAt: receivedAt, instrument: 'CREDIT_CARD', channel: 'REVERSAL',
          merchantRaw: refund[2].trim(), merchantNormalized: merchant,
          categoryId: categorizeMerchant(merchant, 'REVERSAL', 'CREDIT', rules),
          isExcludedFromTotals: false, isUserVerified: false,
        },
      };
    }
    if (limit && tail) {
      return {
        kind: 'card-update', institution, accountTail: tail,
        availableLimit: parseAmount(limit[1]),
      };
    }
  }

  const iciciMatch = bank?.id === 'icici_bank' && firstMatch(text, [
    /(?:Acct|Acc|Account)\s+(?:XX+|x+)?(\d{3,})[\s\S]{0,100}?\b(?:is\s+)?debited\s+(?:for|with)?\s*(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Acct|Acc|Account)\s+(?:XX+|x+)?(\d{3,})[\s\S]{0,100}?\b(?:is\s+)?credited\s+(?:with|:)?\s*(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Acct|Acc|Account)\s+(?:XX+|x+)?(\d{3,})[\s\S]{0,100}?\b(?:debited|credited)\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]);
  const canaraPaid = bank?.id === 'canara_bank' && text.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)\s+paid\s+thru\s+A\/C\s+(?:XX+|x+)?(\d{3,})(?:\s+to\s+([^,\n]+))?(?:,\s*UPI\s+Ref\s+([A-Z0-9]+))?/i);
  const canaraGeneric = bank?.id === 'canara_bank' && text.match(/(?:An\s+amount\s+of\s+)?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)\s+has\s+been\s+(DEBITED|CREDITED)\s+to\s+your\s+account\s+(?:XX+|x+)?(\d{3,})/i);
  const canaraAcct = bank?.id === 'canara_bank' && text.match(/(?:Your\s+)?(?:a\/c|account)\s+(?:no\.?\s*)?(?:XX+|x+)?(\d{3,})\s+(?:has\s+been\s+)?(credited|debited)\s+(?:with\s+)?(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const canaraDr = bank?.id === 'canara_bank' && text.match(/Acct\s+(?:XX+|x+)?(\d{3,})\s+Dr\.\s*(?:INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);

  let amount: number | undefined;
  let direction: Direction = 'DEBIT';
  let instrument: Instrument = 'BANK_ACCOUNT';
  let rawMerchant = '';
  let transactionTail = tail;
  let matched = false;
  let categoryOverride: string | undefined;
  let excluded = false;

  if (iciciMatch) {
    transactionTail = iciciMatch[1];
    amount = parseAmount(iciciMatch[2]);
    direction = /\bcredit/i.test(iciciMatch[0]) ? 'CREDIT' : 'DEBIT';
    rawMerchant = captureMerchant(text, 'icici');
    matched = true;
    if (/\b(?:NFS|ATM|CASH WDL)\b/i.test(text)) categoryOverride = 'cash';
    if (/\bNEFT\b/i.test(text) && direction === 'CREDIT' && /\bsalary\b/i.test(text)) categoryOverride = 'salary';
    if (/\bUPI\s+Lite\b/i.test(text)) { instrument = 'UPI_LITE'; categoryOverride = 'transfers'; excluded = true; }
    if (/\bloan\b.*\bdisburs/i.test(text)) { instrument = 'LOAN'; categoryOverride = 'emi'; excluded = true; }
  } else if (canaraPaid) {
    amount = parseAmount(canaraPaid[1]);
    transactionTail = canaraPaid[2];
    rawMerchant = canaraPaid[3]?.trim() ?? '';
    direction = 'DEBIT';
    matched = true;
  } else if (canaraGeneric) {
    amount = parseAmount(canaraGeneric[1]);
    direction = canaraGeneric[2].toUpperCase() === 'CREDITED' ? 'CREDIT' : 'DEBIT';
    transactionTail = canaraGeneric[3];
    matched = true;
  } else if (canaraAcct) {
    transactionTail = canaraAcct[1];
    direction = canaraAcct[2].toLowerCase() === 'credited' ? 'CREDIT' : 'DEBIT';
    amount = parseAmount(canaraAcct[3]);
    rawMerchant = captureMerchant(text, 'canara');
    matched = true;
  } else if (canaraDr) {
    transactionTail = canaraDr[1];
    amount = parseAmount(canaraDr[2]);
    direction = 'DEBIT';
    rawMerchant = captureMerchant(text, 'canara');
    matched = true;
  }

  if (matched && amount) {
    if (receivedDateMismatch(text, receivedAt)) {
      return { kind: 'review', reason: 'The date written in this message differs from its received date by more than 36 hours. Confirm the correct date.', parsedAmount: amount };
    }
    const channel: Channel = /\bUPI\b/i.test(text) ? 'UPI'
      : /\b(?:NFS|ATM|CASH WDL)\b/i.test(text) ? 'ATM'
      : /\bNEFT\b/i.test(text) ? 'NEFT'
      : /\bIMPS\b/i.test(text) ? 'IMPS'
      : /\bRTGS\b/i.test(text) ? 'RTGS'
      : /\b(?:NACH|AutoPay|mandate)\b/i.test(text) ? 'AUTO_DEBIT'
      : /\b(?:fee|charges|GST)\b/i.test(text) ? 'FEE' : 'OTHER';
    const merchant = normalizeMerchant(rawMerchant);
    return {
      kind: 'transaction', institution, accountTail: transactionTail,
      transaction: {
        institutionId, accountTail: transactionTail, amount, direction,
        occurredAt: receivedAt, instrument, channel, merchantRaw: rawMerchant,
        merchantNormalized: merchant,
        categoryId: categoryOverride ?? categorizeMerchant(merchant, channel, direction, rules),
        referenceNumber: captureReference(text), isExcludedFromTotals: excluded, isUserVerified: false,
      },
    };
  }

  if (bank?.id === 'canara_bank' && /\bloan\b/i.test(text) && amountInText && /\b(?:disbursed|credited)\b/i.test(text)) {
    if (receivedDateMismatch(text, receivedAt)) {
      return { kind: 'review', reason: 'The date written in this message differs from its received date by more than 36 hours. Confirm the correct date.', parsedAmount: amountInText };
    }
    return {
      kind: 'transaction', institution, accountTail: tail,
      transaction: {
        institutionId, accountTail: tail, amount: amountInText, direction: 'CREDIT',
        occurredAt: receivedAt, instrument: 'LOAN', channel: 'OTHER',
        merchantRaw: 'Loan disbursement', merchantNormalized: 'LOAN DISBURSEMENT',
        categoryId: 'emi', isExcludedFromTotals: true, isUserVerified: false,
      },
    };
  }

  const hasAccountLanguage = /\b(?:your\s+)?(?:a\/c|account|card)\b/i.test(text);
  const hasTransactionAction =
    /\b(?:debit(?:ed)?|credit(?:ed)?|spent|paid|purchase|purchased|withdrawn|charged|received|refund(?:ed)?|reversal|cashback)\b/i.test(text);
  const hasBankAlertEvidence =
    !!captureTail(text) ||
    !!captureReference(text) ||
    /\b(?:avl\.?\s*bal(?:ance)?|available\s+balance)\b/i.test(text) ||
    /\b(?:UPI|NEFT|IMPS|RTGS|NFS|ATM|POS|NACH|ECS|ACH)\b/i.test(text) ||
    (hasAccountLanguage && hasTransactionAction) ||
    (!!identifyBank('', text) && /\b(?:transaction|txn|payment|debit|credit|spent|paid)\b/i.test(text));
  if (!hasBankAlertEvidence) {
    return {
      kind: 'rejected',
      reason: 'This does not contain enough detail to verify it as a bank alert. Use Add manually to enter a transaction.',
      manualEntry: true,
    };
  }

  const genericResult = parseGenericBankTransaction(text, receivedAt, institution, institutionId, rules, confirmedDirection);
  return genericResult.kind === 'review' && amountInText !== undefined && genericResult.parsedAmount === undefined
    ? { ...genericResult, parsedAmount: amountInText }
    : genericResult;
}

export function messageHash(body: string, sender: string, receivedAt: string): string {
  const value = `${body}\u0000${normalizeSender(sender)}\u0000${receivedAt}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function accountForTransaction(
  transaction: Pick<Transaction, 'institutionId' | 'accountTail' | 'instrument'>,
  accounts: Account[],
): Account | undefined {
  if (!transaction.institutionId || !transaction.accountTail) return undefined;
  return accounts
    .filter((account) => account.institutionId === transaction.institutionId && account.isActive)
    .map((account) => ({ account, score: suffixMatch(account.accountTail, transaction.accountTail) }))
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)[0]?.account;
}

export function createDemoState(): LedgerState {
  const accounts: Account[] = [
    { id: 'demo-icici', institutionId: 'icici_bank', institution: 'ICICI Bank', displayName: 'Everyday account', instrumentType: 'BANK_ACCOUNT', accountTail: '4821', isActive: true },
    { id: 'demo-canara', institutionId: 'canara_bank', institution: 'Canara Bank', displayName: 'Savings account', instrumentType: 'BANK_ACCOUNT', accountTail: '1080', isActive: true },
    { id: 'demo-hdfc', institutionId: 'hdfc_cards', institution: 'HDFC Bank', displayName: 'MoneyBack+ card', instrumentType: 'CREDIT_CARD', accountTail: '0671', creditLimit: 180000, availableLimit: 132540, dueAmount: 12460, dueDate: new Date(Date.now() + 12 * 86400000).toISOString(), isActive: true },
  ];
  const now = new Date();
  const records: Array<[number, number, Direction, string, string, Instrument, Channel, string]> = [
    [1, 2499, 'DEBIT', 'AMAZON', 'shopping', 'CREDIT_CARD', 'ECOM', 'demo-hdfc'],
    [2, 680, 'DEBIT', 'SWIGGY', 'food', 'BANK_ACCOUNT', 'UPI', 'demo-icici'],
    [3, 1840, 'DEBIT', 'BIGBASKET', 'groceries', 'BANK_ACCOUNT', 'UPI', 'demo-icici'],
    [4, 899, 'DEBIT', 'NETFLIX', 'subscriptions', 'CREDIT_CARD', 'ECOM', 'demo-hdfc'],
    [5, 550, 'DEBIT', 'UBER', 'transport', 'BANK_ACCOUNT', 'UPI', 'demo-canara'],
    [6, 125000, 'CREDIT', 'SALARY', 'salary', 'BANK_ACCOUNT', 'NEFT', 'demo-icici'],
    [7, 1250, 'DEBIT', 'HUNGERBOX', 'food', 'BANK_ACCOUNT', 'UPI', 'demo-icici'],
    [8, 3400, 'DEBIT', 'BLINKIT', 'groceries', 'BANK_ACCOUNT', 'UPI', 'demo-canara'],
    [9, 2199, 'DEBIT', 'MYNTRA', 'shopping', 'CREDIT_CARD', 'ECOM', 'demo-hdfc'],
    [10, 400, 'DEBIT', 'JIO', 'bills', 'BANK_ACCOUNT', 'AUTO_DEBIT', 'demo-icici'],
    [11, 725, 'DEBIT', 'ZOMATO', 'food', 'BANK_ACCOUNT', 'UPI', 'demo-icici'],
    [12, 1100, 'DEBIT', 'RAPIDO', 'transport', 'BANK_ACCOUNT', 'UPI', 'demo-canara'],
    [14, 5000, 'DEBIT', 'HOME RENT', 'home', 'BANK_ACCOUNT', 'NEFT', 'demo-icici'],
    [15, 1500, 'DEBIT', 'PHARMEASY', 'health', 'BANK_ACCOUNT', 'UPI', 'demo-canara'],
    [16, 15000, 'CREDIT', 'CARD PAYMENT', 'card-payment', 'CREDIT_CARD', 'REVERSAL', 'demo-hdfc'],
    [18, 799, 'DEBIT', 'SPOTIFY', 'subscriptions', 'CREDIT_CARD', 'ECOM', 'demo-hdfc'],
    [20, 1990, 'DEBIT', 'AMAZON', 'shopping', 'CREDIT_CARD', 'ECOM', 'demo-hdfc'],
    [22, 1200, 'DEBIT', 'BIGBASKET', 'groceries', 'BANK_ACCOUNT', 'UPI', 'demo-icici'],
    [24, 3500, 'DEBIT', 'ELECTRICITY BILL', 'bills', 'BANK_ACCOUNT', 'AUTO_DEBIT', 'demo-canara'],
    [26, 650, 'DEBIT', 'SWIGGY', 'food', 'BANK_ACCOUNT', 'UPI', 'demo-icici'],
  ];
  const transactions = records.map(([daysAgo, amount, direction, merchant, categoryId, instrument, channel, accountId]) => {
    const occurred = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - daysAgo), 13, 15);
    return {
      id: `demo-tx-${daysAgo}`, institutionId: accounts.find((account) => account.id === accountId)?.institutionId,
      accountId, accountTail: accounts.find((account) => account.id === accountId)?.accountTail ?? '',
      amount, direction, occurredAt: occurred.toISOString(), instrument, channel,
      merchantRaw: merchant, merchantNormalized: merchant, categoryId, isExcludedFromTotals: categoryId === 'card-payment',
      isUserVerified: true,
    } as Transaction;
  });
  return { ...EMPTY_STATE, transactions, accounts, demoMode: true };
}
