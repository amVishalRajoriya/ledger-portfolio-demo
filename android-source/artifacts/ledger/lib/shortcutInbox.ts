import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const UUID_FILE_NAME = /^[0-9a-f-]{36}\.json$/i;
const MAX_MESSAGE_LENGTH = 12_000;
const INBOX_DIRECTORY_NAME = 'ledger-shortcut-inbox';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readShortcutInbox(): Promise<ShortcutInboxScan> {
  if (Platform.OS !== 'ios') return { messages: [], invalidCount: 0 };
  const inboxDirectory = new Directory(Paths.document, INBOX_DIRECTORY_NAME);
  if (!inboxDirectory.exists) return { messages: [], invalidCount: 0 };

  const messages: ShortcutInboxMessage[] = [];
  let invalidCount = 0;

  for (const entry of inboxDirectory.list()) {
    if (!(entry instanceof File) || !UUID_FILE_NAME.test(entry.name)) continue;

    try {
      const value: unknown = JSON.parse(await entry.text());
      if (
        !isRecord(value) ||
        value.version !== 1 ||
        typeof value.messageText !== 'string' ||
        value.messageText.trim().length === 0 ||
        value.messageText.length > MAX_MESSAGE_LENGTH ||
        typeof value.senderID !== 'string' ||
        value.senderID.trim().length === 0 ||
        value.senderID.length > 256 ||
        typeof value.receivedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.receivedAt))
      ) {
        invalidCount += 1;
        continue;
      }

      messages.push({
        fileName: entry.name,
        messageText: value.messageText,
        senderID: value.senderID,
        receivedAt: new Date(value.receivedAt).toISOString(),
      });
    } catch {
      invalidCount += 1;
    }
  }

  messages.sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
  return { messages, invalidCount };
}

export function deleteShortcutInboxFile(fileName: string): void {
  if (Platform.OS !== 'ios') return;
  if (!UUID_FILE_NAME.test(fileName)) throw new Error('Invalid local Shortcut inbox file name.');
  const inboxDirectory = new Directory(Paths.document, INBOX_DIRECTORY_NAME);
  const file = new File(inboxDirectory, fileName);
  if (file.exists) file.delete();
}
