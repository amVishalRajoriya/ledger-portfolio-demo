export interface ShortcutInboxMessage {
  fileName: string;
  messageText: string;
  senderID: string;
  receivedAt: string;
}

export interface ShortcutInboxScan {
  messages: ShortcutInboxMessage[];
  invalidCount: number;
}

export async function readShortcutInbox(): Promise<ShortcutInboxScan> {
  return { messages: [], invalidCount: 0 };
}

export function deleteShortcutInboxFile(_fileName: string): void {}
