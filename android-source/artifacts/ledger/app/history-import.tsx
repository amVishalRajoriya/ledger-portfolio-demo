import React, { useState } from 'react';
import { PermissionsAndroid, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { getRecentAndroidSms, isPotentialAndroidBankAlert, type AndroidSmsHistoryMessage } from '@/lib/androidNotificationImport';
import { parseBankMessage } from '@/lib/ledger';
import { ActionButton, Card, Notice, Page, PageHeader } from '@/components/LedgerUI';

export default function HistoryImportScreen() {
  const colors = useColors();
  const router = useRouter();
  const { ingestSms, rules } = useLedger();
  const [candidates, setCandidates] = useState<AndroidSmsHistoryMessage[]>([]);
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');

  const scanHistory = async () => {
    if (Platform.OS !== 'android') {
      setError('Recent SMS import is available in the installed Android app.');
      return;
    }
    setBusy(true);
    setError('');
    setSummary('');
    try {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
        title: 'Allow recent SMS import?',
        message: 'Ledger will check only SMS received in the last 90 days for likely bank transaction alerts. Matching messages are shown for your approval before they can affect the dashboard. Processing stays on this device.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      });
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setError('Permission was not granted. Ledger did not read your messages.');
        return;
      }
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const messages = await getRecentAndroidSms(cutoff);
      const likely = messages.filter((message) => isPotentialAndroidBankAlert({
        id: message.id,
        title: message.sender,
        text: message.body,
        packageName: message.sender,
        receivedAt: message.receivedAt,
      }));
      setCandidates(likely);
      setScanned(true);
      setSummary(`${messages.length} recent messages checked; ${likely.length} look like possible bank alerts.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not scan recent SMS messages.');
    } finally {
      setBusy(false);
    }
  };

  const addForReview = () => {
    let queued = 0;
    let skipped = 0;
    for (const message of candidates) {
      const parsed = parseBankMessage(message.body, message.sender, message.receivedAt, rules);
      if (parsed.kind === 'rejected') {
        skipped += 1;
        continue;
      }
      const result = ingestSms(message.body, message.sender, message.receivedAt, undefined, true);
      if (result.kind !== 'review' || !result.reason.includes('already imported')) queued += 1;
      else skipped += 1;
    }
    setSummary(`${queued} message${queued === 1 ? '' : 's'} added to Review for approval${skipped ? `; ${skipped} skipped as unrelated or already imported` : ''}.`);
    setCandidates([]);
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Private history import"
        title="Recent bank messages"
        subtitle="Scan up to 90 days of SMS after granting Android permission. Nothing is added to your dashboard until you review it."
        onBack={() => router.back()}
      />
      <Notice tone="warning" icon="shield">
        Ledger receives access to SMS through Android permission. It scans locally, keeps likely alerts only, and sends no message text to a server. Revoke SMS permission any time in Android settings.
      </Notice>
      {error ? <Notice tone="warning" icon="alert-triangle">{error}</Notice> : null}
      {summary ? <Notice tone="positive" icon="check-circle">{summary}</Notice> : null}
      {candidates.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
            {candidates.length} possible bank alert{candidates.length === 1 ? '' : 's'} found
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>
            They will go to Review first. You can inspect each message and preview its details before adding anything to your transactions.
          </Text>
          <ActionButton label="Add possible alerts to Review" icon="inbox" onPress={addForReview} testID="history-add-to-review" />
        </Card>
      ) : null}
      {scanned && candidates.length === 0 ? (
        <Card style={{ padding: 20, gap: 8 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>No likely bank alerts found</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>
            No messages were added. You can still paste a bank alert manually if one was missed.
          </Text>
        </Card>
      ) : null}
      <ActionButton
        label={busy ? 'Checking messages…' : scanned ? 'Scan again' : 'Grant permission and scan'}
        icon="search"
        loading={busy}
        disabled={busy}
        onPress={() => { void scanHistory(); }}
        testID="scan-recent-sms"
      />
    </Page>
  );
}
