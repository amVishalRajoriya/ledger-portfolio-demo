import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { Channel, Direction, Instrument, localDateInput } from '@/lib/ledger';
import {
  ActionButton,
  Card,
  Notice,
  Page,
  PageHeader,
  Pill,
  TextField,
  sharedStyles,
} from '@/components/LedgerUI';

const channels: Channel[] = ['UPI', 'POS', 'ECOM', 'ATM', 'NEFT', 'AUTO_DEBIT', 'CASH', 'OTHER'];

export default function NewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reviewId?: string }>();
  const colors = useColors();
  const { accounts, categories, addTransaction, resolveReview } = useLedger();
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(localDateInput());
  const [direction, setDirection] = useState<Direction>('DEBIT');
  const [channel, setChannel] = useState<Channel>('UPI');
  const [instrument, setInstrument] = useState<Instrument>('BANK_ACCOUNT');
  const [categoryId, setCategoryId] = useState('uncategorised');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const chosenAccount = useMemo(() => accounts.find((account) => account.id === accountId), [accounts, accountId]);

  const save = () => {
    const value = Number(amount.replace(/,/g, '').trim());
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    const occurredAt = new Date(`${date}T12:00:00`);
    if (Number.isNaN(occurredAt.getTime())) {
      setError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (!merchant.trim()) {
      setError('Add a merchant or a short description.');
      return;
    }
    addTransaction({
      institutionId: chosenAccount?.institutionId,
      accountId: chosenAccount?.id,
      accountTail: chosenAccount?.accountTail,
      amount: Math.round(value * 100) / 100,
      direction,
      occurredAt: occurredAt.toISOString(),
      instrument: chosenAccount?.instrumentType ?? instrument,
      channel,
      merchantRaw: merchant.trim(),
      merchantNormalized: merchant.trim().toUpperCase(),
      categoryId,
      note: note.trim() || undefined,
      isExcludedFromTotals: false,
      isUserVerified: true,
    });
    if (typeof params.reviewId === 'string') resolveReview(params.reviewId, true);
    router.replace(typeof params.reviewId === 'string' ? '/review' : '/');
  };

  return (
    <Page scroll={false}>
      <PageHeader eyebrow="Manual entry" title="New transaction" onBack={() => router.back()} />
      <KeyboardAwareScrollViewCompat
        bottomOffset={44}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={{ gap: 10 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Direction</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pill label="Expense" selected={direction === 'DEBIT'} onPress={() => setDirection('DEBIT')} style={{ flex: 1, alignItems: 'center' }} />
            <Pill label="Income" selected={direction === 'CREDIT'} onPress={() => setDirection('CREDIT')} style={{ flex: 1, alignItems: 'center' }} />
          </View>
        </Card>
        <TextField
          label="Amount"
          value={amount}
          onChangeText={(value) => { setAmount(value); setError(''); }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          accessibilityLabel="Transaction amount in rupees"
          testID="transaction-amount"
        />
        <TextField label="Merchant or description" value={merchant} onChangeText={setMerchant} placeholder="e.g. Swiggy, rent, salary" />
        <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

        {accounts.length > 0 ? (
          <View style={{ gap: 9 }}>
            <Text style={[sharedStyles.fieldLabel, { color: colors.foreground }]}>Account</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill label="Not set" selected={!accountId} onPress={() => setAccountId('')} />
              {accounts.filter((account) => account.isActive).map((account) => (
                <Pill
                  key={account.id}
                  label={`${account.displayName} ··${account.accountTail}`}
                  selected={accountId === account.id}
                  onPress={() => setAccountId(account.id)}
                />
              ))}
            </View>
          </View>
        ) : (
          <Notice icon="info">You can add an account later; this entry will still be saved.</Notice>
        )}

        <View style={{ gap: 9 }}>
          <Text style={[sharedStyles.fieldLabel, { color: colors.foreground }]}>Instrument</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['BANK_ACCOUNT', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'WALLET'] as Instrument[]).map((option) => (
              <Pill
                key={option}
                label={option.replaceAll('_', ' ')}
                selected={instrument === option}
                onPress={() => setInstrument(option)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 9 }}>
          <Text style={[sharedStyles.fieldLabel, { color: colors.foreground }]}>How it was paid</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {channels.map((option) => (
              <Pill key={option} label={option.replaceAll('_', ' ')} selected={channel === option} onPress={() => setChannel(option)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 9 }}>
          <Text style={[sharedStyles.fieldLabel, { color: colors.foreground }]}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((category) => (
              <Pill key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
        </View>
        <TextField label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
        {error ? <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{error}</Text> : null}
        <ActionButton label="Save transaction" icon="check" onPress={save} />
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}
