import type { ParseResult } from './ledger';

export function getUnparsedNotificationReviewReason(result: ParseResult): string | undefined {
  if (result.kind !== 'rejected') return undefined;
  return `This notification looked like a bank alert, but Ledger could not parse it automatically. ${result.reason}`;
}
