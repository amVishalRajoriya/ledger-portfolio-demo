import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  Account,
  EMPTY_STATE,
  LedgerState,
  ParseResult,
  RawMessage,
  ReviewItem,
  Transaction,
  UserRule,
  accountForTransaction,
  createDemoState,
  makeId,
  messageHash,
  normalizeMerchant,
  parseBankMessage,
  suffixMatch,
} from '@/lib/ledger';
import {
  deleteShortcutInboxFile,
  readShortcutInbox,
  ShortcutInboxMessage,
} from '@/lib/shortcutInbox';

const STORAGE_KEY = 'ledger.local.v1';
const ONBOARDING_KEY = 'ledger.onboarding.complete.v1';

interface LedgerContextValue extends LedgerState {
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  storageWarning?: string;
  shortcutImportWarning?: string;
  completeOnboarding: () => Promise<boolean>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  addAccount: (account: Omit<Account, 'id' | 'isActive'> & { isActive?: boolean }) => string;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  ingestSms: (body: string, sender: string, receivedAt: string, reviewId?: string) => ParseResult;
  createRule: (merchant: string, categoryId: string) => void;
  resolveReview: (id: string, discardMessage?: boolean) => void;
  toggleFyMode: () => void;
  loadDemo: () => void;
  clearLedger: () => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

function makeRawMessage(body: string, sender: string, receivedAt: string): RawMessage {
  return {
    id: makeId('message'),
    contentHash: messageHash(body, sender, receivedAt),
    body,
    sender,
    receivedAt,
    status: 'NEEDS_REVIEW',
  };
}

function transactionSimilarity(a: Transaction, b: Transaction): boolean {
  if (
    !a.institutionId ||
    a.institutionId !== b.institutionId ||
    a.amount !== b.amount ||
    a.direction !== b.direction ||
    Math.abs(new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()) > 180_000
  ) return false;
  if (a.referenceNumber && b.referenceNumber && a.referenceNumber !== b.referenceNumber) return false;
  return true;
}

function latestOwnerMatch(transaction: Transaction, previous: Transaction): boolean {
  const left = normalizeMerchant(transaction.merchantNormalized);
  const right = normalizeMerchant(previous.merchantNormalized);
  return left.length >= 10 && right.length >= 10 && (left.startsWith(right) || right.startsWith(left));
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LedgerState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string>();
  const [shortcutImportWarning, setShortcutImportWarning] = useState<string>();
  const [shortcutScanVersion, setShortcutScanVersion] = useState(0);
  const [shortcutQueue, setShortcutQueue] = useState<ShortcutInboxMessage[]>([]);
  const [shortcutFilesAwaitingSave, setShortcutFilesAwaitingSave] = useState<string[]>([]);
  const shortcutProcessingRef = useRef(false);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(ONBOARDING_KEY),
    ])
      .then(([stored, onboarding]) => {
        if (!mounted) return;
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<LedgerState>;
          setState({ ...EMPTY_STATE, ...parsed });
        }
        setHasCompletedOnboarding(onboarding === 'true');
      })
      .catch(() => {
        if (mounted) setStorageWarning('Saved data could not be opened. Ledger changes may not persist.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setHasCompletedOnboarding(true);
      return true;
    } catch {
      setStorageWarning('Onboarding could not be saved. Please try again before leaving this screen.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const snapshot = JSON.stringify(state);
    const filesToDelete = [...shortcutFilesAwaitingSave];
    persistenceQueueRef.current = persistenceQueueRef.current
      .then(async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, snapshot);
        } catch {
          setStorageWarning('Could not save the latest change on this device. Check available storage.');
          if (filesToDelete.length > 0) {
            setShortcutImportWarning('A Shortcut message could not be saved yet. It has been kept on this iPhone and will be retried.');
          }
          return;
        }
        try {
          for (const fileName of filesToDelete) deleteShortcutInboxFile(fileName);
        } catch {
          setShortcutImportWarning('A Shortcut message was saved, but its local queue file could not be cleared. It will be checked again.');
          return;
        }
        if (filesToDelete.length > 0) {
          const completed = new Set(filesToDelete);
          setShortcutFilesAwaitingSave((current) => current.filter((name) => !completed.has(name)));
          setShortcutQueue((current) => current.filter((item) => !completed.has(item.fileName)));
          setShortcutImportWarning(undefined);
        }
      })
      .catch(() => {
        setStorageWarning('Could not save the latest change on this device. Check available storage.');
      });
  }, [state, isLoading, shortcutFilesAwaitingSave, shortcutScanVersion]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') setShortcutScanVersion((version) => version + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isLoading || Platform.OS !== 'ios') return;
    let cancelled = false;
    readShortcutInbox()
      .then(({ messages, invalidCount }) => {
        if (cancelled) return;
        if (invalidCount > 0) {
          setShortcutImportWarning('A Shortcut message could not be read. Its local file was kept for recovery.');
        }
        setShortcutQueue((current) => {
          const heldFileNames = new Set(current.map((item) => item.fileName));
          const additions = messages.filter((item) => !heldFileNames.has(item.fileName));
          return additions.length > 0 ? [...current, ...additions] : current;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setShortcutImportWarning('Ledger could not open its local Shortcut inbox. Messages remain on this iPhone.');
        }
      });
    return () => { cancelled = true; };
  }, [isLoading, shortcutScanVersion]);

  const addTransaction = useCallback((input: Omit<Transaction, 'id'>) => {
    const id = makeId('transaction');
    setState((current) => {
      let transaction: Transaction = { ...input, id };
      let transactions = [...current.transactions];

      const duplicateCandidates = transactions.filter((existing) => transactionSimilarity(transaction, existing));
      const fieldMergeTarget = duplicateCandidates.find((existing) => {
        const sameTail = suffixMatch(existing.accountTail, transaction.accountTail) >= 3;
        const existingIsGeneric = !existing.merchantNormalized && !existing.referenceNumber;
        const incomingIsDetailed = !!transaction.merchantNormalized && !!transaction.referenceNumber;
        const incomingIsGeneric = !transaction.merchantNormalized && !transaction.referenceNumber;
        const existingIsDetailed = !!existing.merchantNormalized && !!existing.referenceNumber;
        return sameTail && ((existingIsGeneric && incomingIsDetailed) || (incomingIsGeneric && existingIsDetailed));
      });
      if (fieldMergeTarget) {
        const generic = !fieldMergeTarget.merchantNormalized ? fieldMergeTarget : transaction;
        const detailed = fieldMergeTarget.merchantNormalized ? fieldMergeTarget : transaction;
        transactions = transactions.map((item) => item.id === fieldMergeTarget.id
          ? {
              ...item,
              merchantRaw: detailed.merchantRaw || item.merchantRaw,
              merchantNormalized: detailed.merchantNormalized || item.merchantNormalized,
              referenceNumber: detailed.referenceNumber || item.referenceNumber,
              note: generic.note ? `Balance alert: ${generic.note}` : item.note,
            }
          : item);
        return {
          ...current,
          transactions,
          rawMessages: current.rawMessages.map((message) => message.id === input.sourceMessageId
            ? { ...message, status: 'DUPLICATE', transactionId: fieldMergeTarget.id }
            : message),
        };
      }

      if (duplicateCandidates.length > 0) {
        const reviewId = makeId('review');
        return {
          ...current,
          reviews: [{
            id: reviewId,
            rawMessageId: input.sourceMessageId,
            body: current.rawMessages.find((item) => item.id === input.sourceMessageId)?.body ?? '',
            sender: current.rawMessages.find((item) => item.id === input.sourceMessageId)?.sender ?? '',
            receivedAt: transaction.occurredAt,
            reason: 'A similar transaction is within three minutes. Confirm whether this is a second charge.',
            parsedAmount: transaction.amount,
          }, ...current.reviews],
          rawMessages: current.rawMessages.map((message) => message.id === input.sourceMessageId
            ? { ...message, status: 'NEEDS_REVIEW' }
            : message),
        };
      }

      const refundMatch = transaction.direction === 'CREDIT' &&
        transaction.channel === 'REVERSAL' &&
        transaction.categoryId !== 'card-payment' &&
        transaction.merchantNormalized
        ? transactions.find((previous) => {
            const age = new Date(transaction.occurredAt).getTime() - new Date(previous.occurredAt).getTime();
            return previous.direction === 'DEBIT' &&
              previous.amount === transaction.amount &&
              previous.merchantNormalized === transaction.merchantNormalized &&
              age >= 0 && age < 90 * 86400000;
          })
        : undefined;
      const previousTransaction = refundMatch ?? transactions.find((previous) => {
        const hours = Math.abs(new Date(transaction.occurredAt).getTime() - new Date(previous.occurredAt).getTime()) / 3_600_000;
        if (hours > 24 || previous.amount !== transaction.amount || previous.direction === transaction.direction) return false;
        if (transaction.direction === 'CREDIT' && transaction.channel === 'REVERSAL' && transaction.categoryId !== 'card-payment') return false;
        if (transaction.instrument === 'CREDIT_CARD' && transaction.direction === 'CREDIT') {
          return previous.instrument !== 'CREDIT_CARD' && previous.direction === 'DEBIT';
        }
        if (transaction.instrument !== 'CREDIT_CARD' && previous.instrument === 'CREDIT_CARD') {
          return transaction.direction === 'DEBIT' && previous.direction === 'CREDIT' && previous.categoryId === 'card-payment';
        }
        return previous.accountId !== transaction.accountId && latestOwnerMatch(transaction, previous);
      });
      if (previousTransaction) {
        const linkType = transaction.instrument === 'CREDIT_CARD' || previousTransaction.instrument === 'CREDIT_CARD'
          ? 'CARD_PAYMENT'
          : transaction.direction === 'CREDIT' && transaction.channel === 'REVERSAL'
            ? 'REVERSAL'
            : 'TRANSFER_PAIR';
        transaction = {
          ...transaction,
          linkedTransactionId: previousTransaction.id,
          linkType,
          isExcludedFromTotals: true,
        };
        transactions = transactions.map((item) => item.id === previousTransaction.id
          ? { ...item, linkedTransactionId: transaction.id, linkType, isExcludedFromTotals: true }
          : item);
      } else if (
        transaction.direction === 'CREDIT' &&
        transaction.channel === 'REVERSAL' &&
        transaction.merchantNormalized
      ) {
        const refundOf = transactions.find((previous) =>
          previous.direction === 'DEBIT' &&
          previous.amount === transaction.amount &&
          previous.merchantNormalized === transaction.merchantNormalized &&
          new Date(transaction.occurredAt).getTime() - new Date(previous.occurredAt).getTime() < 90 * 86400000,
        );
        if (refundOf) {
          transaction = {
            ...transaction,
            linkedTransactionId: refundOf.id,
            linkType: 'REVERSAL',
            isExcludedFromTotals: true,
          };
          transactions = transactions.map((item) => item.id === refundOf.id
            ? { ...item, linkedTransactionId: transaction.id, linkType: 'REVERSAL' }
            : item);
        }
      }

      transactions.unshift(transaction);
      return {
        ...current,
        transactions,
        rawMessages: current.rawMessages.map((message) => message.id === input.sourceMessageId
          ? { ...message, status: 'PARSED', transactionId: transaction.id }
          : message),
        lastMessageAt: transaction.occurredAt,
      };
    });
    return id;
  }, []);

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setState((current) => ({
      ...current,
      transactions: current.transactions.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      transactions: current.transactions
        .filter((item) => item.id !== id)
        .map((item) => item.linkedTransactionId === id
          ? { ...item, linkedTransactionId: undefined, linkType: undefined, isExcludedFromTotals: false }
          : item),
    }));
  }, []);

  const addAccount = useCallback((input: Omit<Account, 'id' | 'isActive'> & { isActive?: boolean }) => {
    const id = makeId('account');
    const account: Account = { ...input, id, isActive: input.isActive ?? true };
    setState((current) => ({
      ...current,
      accounts: [...current.accounts, account],
    }));
    return id;
  }, []);

  const updateAccount = useCallback((id: string, patch: Partial<Account>) => {
    setState((current) => ({
      ...current,
      accounts: current.accounts.map((account) => account.id === id ? { ...account, ...patch } : account),
    }));
  }, []);

  const ingestSms = useCallback((body: string, sender: string, receivedAt: string, reviewId?: string): ParseResult => {
    const result = parseBankMessage(body, sender, receivedAt, state.rules);
    const raw = makeRawMessage(body, sender, receivedAt);
    const retryRawMessageId = reviewId
      ? state.reviews.find((item) => item.id === reviewId)?.rawMessageId
      : undefined;
    if (state.rawMessages.some((message) =>
      message.contentHash === raw.contentHash &&
      message.status !== 'IGNORED' &&
      message.id !== retryRawMessageId,
    )) {
      return { kind: 'review', reason: 'This exact message was already imported.' };
    }

    if (result.kind === 'rejected') {
      setState((current) => ({
        ...current,
        rawMessages: [{
          ...raw,
          status: /promotional|service message/i.test(result.reason) ? 'PROMOTIONAL' : 'REJECTED_NON_TXN',
          rejectReason: result.reason,
        }, ...current.rawMessages],
        lastMessageAt: receivedAt,
      }));
      return result;
    }

    if (result.kind === 'review') {
      const review: ReviewItem = {
        id: makeId('review'),
        rawMessageId: raw.id,
        body,
        sender,
        receivedAt,
        reason: result.reason,
        parsedAmount: result.parsedAmount,
      };
      setState((current) => ({
        ...current,
        rawMessages: [
          { ...raw, status: 'NEEDS_REVIEW' },
          ...current.rawMessages.map((message) => message.id === retryRawMessageId
            ? { ...message, status: 'IGNORED' as const }
            : message),
        ],
        reviews: [reviewId ? { ...review, id: reviewId } : review, ...current.reviews.filter((item) => item.id !== reviewId)],
        lastMessageAt: receivedAt,
      }));
      return result;
    }

    if (result.kind === 'card-update') {
      setState((current) => {
        let account = accountForTransaction({
          institutionId: result.institution === 'HDFC Bank' ? 'hdfc_cards' : '',
          accountTail: result.accountTail,
          instrument: 'CREDIT_CARD',
        }, current.accounts);
        let accounts = current.accounts;
        if (!account && result.institution && result.accountTail) {
          const existingByTail = accounts.find((item) => item.accountTail === result.accountTail && item.instrumentType === 'CREDIT_CARD');
          account = existingByTail;
          if (!account) {
            account = {
              id: makeId('account'), institutionId: 'hdfc_cards', institution: result.institution,
              displayName: `${result.institution} credit card`, accountTail: result.accountTail,
              instrumentType: 'CREDIT_CARD', isActive: true,
            };
            accounts = [...accounts, account];
          }
        }
        if (!account) {
          const review: ReviewItem = {
            id: reviewId ?? makeId('review'), rawMessageId: raw.id, body, sender, receivedAt,
            reason: 'Card update could not be attached to an account. Add the card and retry.',
          };
          return {
            ...current,
            accounts,
            rawMessages: [
              { ...raw, status: 'NEEDS_REVIEW' },
              ...current.rawMessages.map((message) => message.id === retryRawMessageId
                ? { ...message, status: 'IGNORED' as const }
                : message),
            ],
            reviews: [review, ...current.reviews.filter((item) => item.id !== reviewId)],
          };
        }
        const updatedAccount = {
          ...account,
          dueAmount: result.dueAmount ?? account.dueAmount,
          dueDate: result.dueDate ?? account.dueDate,
          availableLimit: result.availableLimit ?? account.availableLimit,
        };
        accounts = accounts.map((item) => item.id === account.id ? updatedAccount : item);
        return {
          ...current,
          accounts,
          rawMessages: [
            { ...raw, status: 'PARSED' },
            ...current.rawMessages.map((message) => message.id === retryRawMessageId
              ? { ...message, status: 'PARSED' as const }
              : message),
          ],
          reviews: current.reviews.filter((item) => item.id !== reviewId),
          lastMessageAt: receivedAt,
        };
      });
      return result;
    }

    const matchedAccount = accountForTransaction(result.transaction, state.accounts);
    const input: Omit<Transaction, 'id'> = {
      ...result.transaction,
      accountId: matchedAccount?.id,
      sourceMessageId: raw.id,
      contentHash: raw.contentHash,
    };
    setState((current) => {
      let accounts = current.accounts;
      let accountId = matchedAccount?.id;
      if (!accountId && result.institution && result.accountTail.length >= 3) {
        const existing = accounts.find((account) =>
          account.institutionId === result.transaction.institutionId &&
          suffixMatch(account.accountTail, result.accountTail) >= 3,
        );
        if (existing) accountId = existing.id;
        else {
          const created: Account = {
            id: makeId('account'),
            institutionId: result.transaction.institutionId ?? 'unknown',
            institution: result.institution,
            displayName: result.transaction.instrument === 'CREDIT_CARD'
              ? `${result.institution} credit card`
              : `${result.institution} account`,
            accountTail: result.accountTail,
            instrumentType: result.transaction.instrument,
            isActive: true,
          };
          accounts = [...accounts, created];
          accountId = created.id;
        }
      }
      let transaction: Transaction = {
        ...input,
        id: makeId('transaction'),
        accountId,
      };
      let transactions = [...current.transactions];

      const candidates = transactions.filter((previous) => transactionSimilarity(transaction, previous));
      const genericPair = candidates.find((previous) => {
        const sameTail = suffixMatch(previous.accountTail, transaction.accountTail) >= 3;
        const previousGeneric = !previous.merchantNormalized && !previous.referenceNumber;
        const currentGeneric = !transaction.merchantNormalized && !transaction.referenceNumber;
        return sameTail && (
          (previousGeneric && !!transaction.merchantNormalized && !!transaction.referenceNumber) ||
          (currentGeneric && !!previous.merchantNormalized && !!previous.referenceNumber)
        );
      });
      if (genericPair) {
        const detailed = genericPair.merchantNormalized ? genericPair : transaction;
        transactions = transactions.map((item) => item.id === genericPair.id
          ? {
              ...item,
              merchantRaw: detailed.merchantRaw,
              merchantNormalized: detailed.merchantNormalized,
              referenceNumber: detailed.referenceNumber,
              accountId: accountId ?? item.accountId,
            }
          : item);
        return {
          ...current, accounts, transactions,
          rawMessages: [
            { ...raw, status: 'DUPLICATE', transactionId: genericPair.id },
            ...current.rawMessages.map((message) => message.id === retryRawMessageId
              ? { ...message, status: 'PARSED' as const, transactionId: genericPair.id }
              : message),
          ],
          reviews: current.reviews.filter((item) => item.id !== reviewId),
          lastMessageAt: receivedAt,
        };
      }
      if (candidates.length > 0) {
        const review: ReviewItem = {
          id: reviewId ?? makeId('review'), rawMessageId: raw.id, body, sender, receivedAt,
          reason: 'A similar transaction arrived within three minutes. Confirm whether this was a second charge.',
          parsedAmount: transaction.amount,
        };
        return {
          ...current, accounts,
          rawMessages: [
            { ...raw, status: 'NEEDS_REVIEW' },
            ...current.rawMessages.map((message) => message.id === retryRawMessageId
              ? { ...message, status: 'IGNORED' as const }
              : message),
          ],
          reviews: [review, ...current.reviews.filter((item) => item.id !== reviewId)],
          lastMessageAt: receivedAt,
        };
      }

      const previousTransaction = transactions.find((previous) => {
        const hours = Math.abs(new Date(transaction.occurredAt).getTime() - new Date(previous.occurredAt).getTime()) / 3_600_000;
        if (hours > 24 || previous.amount !== transaction.amount || previous.direction === transaction.direction) return false;
        if (transaction.instrument === 'CREDIT_CARD' && transaction.direction === 'CREDIT') {
          return previous.instrument !== 'CREDIT_CARD' && previous.direction === 'DEBIT';
        }
        if (transaction.instrument !== 'CREDIT_CARD' && previous.instrument === 'CREDIT_CARD') {
          return transaction.direction === 'DEBIT' && previous.direction === 'CREDIT' && previous.categoryId === 'card-payment';
        }
        return previous.accountId !== transaction.accountId && latestOwnerMatch(transaction, previous);
      });
      if (previousTransaction) {
        const isCardPayment = transaction.categoryId === 'card-payment' || previousTransaction.categoryId === 'card-payment';
        const linkType = isCardPayment || transaction.instrument === 'CREDIT_CARD' || previousTransaction.instrument === 'CREDIT_CARD'
          ? 'CARD_PAYMENT'
          : transaction.direction === 'CREDIT' && transaction.channel === 'REVERSAL'
            ? 'REVERSAL' : 'TRANSFER_PAIR';
        transaction = { ...transaction, linkedTransactionId: previousTransaction.id, linkType, isExcludedFromTotals: true };
        transactions = transactions.map((item) => item.id === previousTransaction.id
          ? { ...item, linkedTransactionId: transaction.id, linkType, isExcludedFromTotals: linkType !== 'REVERSAL' }
          : item);
      } else if (transaction.direction === 'CREDIT' && transaction.channel === 'REVERSAL' && transaction.merchantNormalized) {
        const refundOf = transactions.find((previous) => {
          const age = new Date(transaction.occurredAt).getTime() - new Date(previous.occurredAt).getTime();
          return previous.direction === 'DEBIT' && previous.amount === transaction.amount &&
            previous.merchantNormalized === transaction.merchantNormalized && age >= 0 && age < 90 * 86400000;
        });
        if (refundOf) {
          transaction = { ...transaction, linkedTransactionId: refundOf.id, linkType: 'REVERSAL', isExcludedFromTotals: true };
          transactions = transactions.map((item) => item.id === refundOf.id
            ? { ...item, linkedTransactionId: transaction.id, linkType: 'REVERSAL' }
            : item);
        }
      }

      transactions.unshift(transaction);
      return {
        ...current, accounts, transactions,
        rawMessages: [
          { ...raw, status: 'PARSED', transactionId: transaction.id },
          ...current.rawMessages.map((message) => message.id === retryRawMessageId
            ? { ...message, status: 'PARSED' as const, transactionId: transaction.id }
            : message),
        ],
        reviews: current.reviews.filter((item) => item.id !== reviewId),
        lastMessageAt: receivedAt,
      };
    });
    return result;
  }, [state.accounts, state.rawMessages, state.reviews, state.rules]);

  useEffect(() => {
    const nextMessage = shortcutQueue[0];
    if (
      isLoading ||
      Platform.OS !== 'ios' ||
      !nextMessage ||
      shortcutFilesAwaitingSave.includes(nextMessage.fileName) ||
      shortcutProcessingRef.current
    ) return;

    shortcutProcessingRef.current = true;
    try {
      const result = ingestSms(nextMessage.messageText, nextMessage.senderID, nextMessage.receivedAt);
      if (result.kind === 'review' && result.reason === 'This exact message was already imported.') {
        deleteShortcutInboxFile(nextMessage.fileName);
        setShortcutQueue((current) => current.filter((item) => item.fileName !== nextMessage.fileName));
      } else {
        setShortcutFilesAwaitingSave((current) =>
          current.includes(nextMessage.fileName) ? current : [...current, nextMessage.fileName],
        );
      }
    } catch {
      setShortcutImportWarning('A Shortcut message could not be imported. It has been kept on this iPhone.');
    } finally {
      shortcutProcessingRef.current = false;
    }
  }, [isLoading, shortcutQueue, shortcutFilesAwaitingSave, shortcutScanVersion, ingestSms]);

  const createRule = useCallback((merchant: string, categoryId: string) => {
    const prefix = normalizeMerchant(merchant);
    if (!prefix) return;
    const rule: UserRule = { id: makeId('rule'), merchantPrefix: prefix, categoryId };
    setState((current) => ({
      ...current,
      rules: [rule, ...current.rules.filter((item) => item.merchantPrefix !== prefix)],
      transactions: current.transactions.map((transaction) =>
        transaction.merchantNormalized.startsWith(prefix)
          ? { ...transaction, categoryId }
          : transaction,
      ),
    }));
  }, []);

  const resolveReview = useCallback((id: string, discardMessage = false) => {
    setState((current) => {
      const item = current.reviews.find((review) => review.id === id);
      return {
        ...current,
        reviews: current.reviews.filter((review) => review.id !== id),
        rawMessages: item?.rawMessageId
          ? current.rawMessages.map((message) => message.id === item.rawMessageId
              ? { ...message, status: discardMessage ? 'IGNORED' : 'PARSED' }
              : message)
          : current.rawMessages,
      };
    });
  }, []);

  const toggleFyMode = useCallback(() => {
    setState((current) => ({ ...current, fyMode: !current.fyMode }));
  }, []);

  const loadDemo = useCallback(() => setState(createDemoState()), []);
  const clearLedger = useCallback(() => {
    setState({ ...EMPTY_STATE, categories: [...EMPTY_STATE.categories] });
  }, []);

  const value = useMemo<LedgerContextValue>(() => ({
    ...state,
    isLoading,
    hasCompletedOnboarding,
    storageWarning,
    shortcutImportWarning,
    completeOnboarding,
    addTransaction,
    updateTransaction,
    removeTransaction,
    addAccount,
    updateAccount,
    ingestSms,
    createRule,
    resolveReview,
    toggleFyMode,
    loadDemo,
    clearLedger,
  }), [
    state, isLoading, storageWarning, shortcutImportWarning, addTransaction, updateTransaction, removeTransaction,
    hasCompletedOnboarding, completeOnboarding,
    addAccount, updateAccount, ingestSms, createRule, resolveReview, toggleFyMode, loadDemo, clearLedger,
  ]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const context = useContext(LedgerContext);
  if (!context) throw new Error('useLedger must be used within LedgerProvider');
  return context;
}
