import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { Direction, ParseResult, formatRupees, localDateInput, parseBankMessage } from '@/lib/ledger';
import { useLedger } from '@/context/LedgerContext';
import {
  ActionButton,
  Card,
  Notice,
  Page,
  PageHeader,
  TextField,
} from '@/components/LedgerUI';

export default function ImportScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ body?: string; sender?: string; receivedAt?: string; reviewId?: string }>();
  const { ingestSms, rules } = useLedger();
  const [body, setBody] = useState(typeof params.body === 'string' ? params.body : '');
  const [sender, setSender] = useState(typeof params.sender === 'string' ? params.sender : '');
  const [receivedDate, setReceivedDate] = useState(
    typeof params.receivedAt === 'string' ? params.receivedAt.slice(0, 10) : localDateInput(),
  );
  const [result, setResult] = useState<ParseResult | null>(null);
  const [message, setMessage] = useState('');
  const [confirmedDirection, setConfirmedDirection] = useState<Direction | null>(null);

  const preview = useMemo(() => {
    if (result?.kind !== 'transaction') return null;
    const transaction = result.transaction;
    return {
      amount: transaction.amount,
      direction: transaction.direction,
      merchant: transaction.merchantRaw || transaction.categoryId,
      instrument: transaction.instrument.replaceAll('_', ' '),
      channel: transaction.channel,
      category: transaction.categoryId,
    };
  }, [result]);

  const runPreview = (directionOverride?: Direction) => {
    const date = new Date(`${receivedDate}T12:00:00`);
    if (!body.trim()) {
      setResult({ kind: 'review', reason: 'Paste the complete bank message first.' });
      return;
    }
    if (Number.isNaN(date.getTime())) {
      setResult({ kind: 'review', reason: 'Enter a valid receive date in YYYY-MM-DD format.' });
      return;
    }
    setMessage('');
    const direction = directionOverride ?? confirmedDirection ?? undefined;
    if (directionOverride) setConfirmedDirection(directionOverride);
    setResult(parseBankMessage(body, sender, date.toISOString(), rules, direction));
  };

  const saveMessage = () => {
    const date = new Date(`${receivedDate}T12:00:00`);
    const saved = ingestSms(body.trim(), sender.trim(), date.toISOString(), params.reviewId, false, confirmedDirection ?? undefined);
    if (saved.kind === 'review' && saved.reason.includes('already imported')) {
      setMessage(saved.reason);
      if (params.reviewId) setTimeout(() => router.replace('/review'), 650);
      return;
    }
    if (saved.kind === 'transaction') {
      setMessage('Transaction saved to this device.');
    }
    else if (saved.kind === 'card-update') setMessage('Card details saved on this device.');
    else if (saved.kind === 'rejected') setMessage('Message kept in the local archive and left out of your totals.');
    else setMessage('Message added to the Review Inbox. No transaction was created.');
    setTimeout(() => router.replace(params.reviewId ? '/review' : '/'), 650);
  };

  const saveOrEnterManually = () => {
    if (result?.kind === 'rejected' && result.manualEntry) {
      router.push({ pathname: '/new', params: params.reviewId ? { reviewId: params.reviewId } : undefined });
      return;
    }
    saveMessage();
  };

  return (
    <Page scroll={false}>
      <PageHeader
        eyebrow="Private import"
        title="Add a bank SMS"
        subtitle="Ledger checks common INR transaction details on this device. SMS text is never sent to a server."
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollViewCompat
        bottomOffset={36}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 17, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Notice icon="lock" tone="positive">
          Use the message’s received date—not the date written inside it. The body date can be ambiguous.
        </Notice>

        <TextField
          label="Bank message"
          value={body}
          onChangeText={(value) => { setBody(value); setResult(null); setConfirmedDirection(null); }}
          placeholder="Paste the complete SMS alert"
          multiline
          autoCapitalize="sentences"
          accessibilityLabel="Bank message"
          testID="sms-message-input"
        />

        <View style={{ gap: 9 }}>
          <TextField
            label="SMS sender ID (optional)"
            value={sender}
            onChangeText={(value) => { setSender(value); setResult(null); setMessage(''); setConfirmedDirection(null); }}
            placeholder="e.g. VM-SBIBNK-S"
            autoCapitalize="characters"
          />
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 }}>
            Use the original sender code to label the account. You can leave it blank.
          </Text>
        </View>

        <TextField
          label="Received date"
          value={receivedDate}
          onChangeText={(value) => { setReceivedDate(value); setResult(null); setConfirmedDirection(null); }}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          hint="Set this to the day the message arrived, if you are importing an older SMS."
        />

        <ActionButton label="Preview parse" icon="search" onPress={runPreview} />

        {result ? (
          <Card style={{ gap: 13 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: result.kind === 'transaction' || result.kind === 'card-update' ? colors.positive : colors.warning }} />
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                {result.kind === 'transaction' ? 'Transaction found'
                  : result.kind === 'card-update' ? 'Card update found'
                    : result.kind === 'rejected' ? result.manualEntry ? 'Use manual entry' : 'Not a transaction'
                      : 'Needs a quick review'}
              </Text>
            </View>
            {result.kind === 'transaction' && preview ? (
              <>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 28 }}>
                  {result.transaction.direction === 'CREDIT' ? '+' : '−'}{formatRupees(preview.amount)}
                </Text>
                <View style={{ gap: 5 }}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{preview.merchant}</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>
                    {result.institution} · {preview.instrument} · {preview.channel}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>
                    Category: {preview.category.replaceAll('-', ' ')}
                  </Text>
                </View>
              </>
            ) : result.kind === 'card-update' ? (
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 }}>
                {result.institution}{result.accountTail ? ` ··${result.accountTail}` : ''}
                {result.dueAmount !== undefined ? `\nAmount due ${formatRupees(result.dueAmount)}` : ''}
                {result.dueDate ? `\nDue ${new Date(result.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                {result.availableLimit !== undefined ? `\nAvailable limit ${formatRupees(result.availableLimit)}` : ''}
              </Text>
            ) : (
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 }}>
                {result.kind === 'review' || result.kind === 'rejected' ? result.reason : 'This message does not contain a transaction.'}
                {result.kind === 'review' && result.parsedAmount !== undefined ? `\nPossible amount: ${formatRupees(result.parsedAmount)}` : ''}
              </Text>
            )}
            {result.kind === 'rejected' && result.manualEntry ? (
              <Notice tone="warning" icon="edit-3">
                This text is not being saved as a bank transaction. Add the details in the manual transaction form instead.
              </Notice>
            ) : null}
            {result.kind === 'review' ? (
              <Notice tone="warning" icon="inbox">
                {params.reviewId
                  ? 'This item will stay in Review until the details are clear or you discard it.'
                  : 'Saving this message sends it to the Review Inbox—not into your spending totals.'}
              </Notice>
            ) : null}
            {params.reviewId && result.kind === 'review' &&
              result.reason === 'The message contains both debit and credit wording. Confirm the transaction direction.' &&
              result.parsedAmount !== undefined ? (
                <View style={{ gap: 9 }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>
                    Choose the direction shown by your bank. Ledger will re-parse the message with your confirmation.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 9 }}>
                    <ActionButton label="Confirm as debit" icon="arrow-up-right" secondary style={{ flex: 1 }} onPress={() => runPreview('DEBIT')} />
                    <ActionButton label="Confirm as credit" icon="arrow-down-left" secondary style={{ flex: 1 }} onPress={() => runPreview('CREDIT')} />
                  </View>
                </View>
              ) : null}
            {message ? <Text style={{ color: colors.positive, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{message}</Text> : null}
            <ActionButton
              label={message ? 'Saved' : result.kind === 'review' ? params.reviewId ? 'Keep in Review' : 'Save to review inbox'
                : result.kind === 'rejected' ? result.manualEntry ? 'Add manually instead' : 'Archive message'
                  : 'Save on this device'}
              icon={result.kind === 'rejected' && result.manualEntry ? 'plus' : 'check'}
              secondary={result.kind === 'rejected' && result.manualEntry}
              disabled={!!message}
              onPress={saveOrEnterManually}
            />
          </Card>
        ) : null}

        <View style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center' }}>
            Only messages with bank-alert details are treated as transactions. Incomplete text can be entered through Add manually; ambiguous alerts go to Review.
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}
