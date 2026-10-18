import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { Instrument, makeId } from '@/lib/ledger';
import { ActionButton, Page, PageHeader, Pill, TextField, sharedStyles } from '@/components/LedgerUI';

const instruments: Instrument[] = ['BANK_ACCOUNT', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'WALLET', 'LOAN', 'UPI_LITE'];

export default function NewAccountScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addAccount } = useLedger();
  const [displayName, setDisplayName] = useState('');
  const [instrumentType, setInstrumentType] = useState<Instrument>('BANK_ACCOUNT');
  const [tail, setTail] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');
  const save = () => {
    if (!displayName.trim()) return setError('Give this account a name.');
    const limitValue = limit.trim() ? Number(limit.replace(/,/g, '')) : undefined;
    if (limit.trim() && (!Number.isFinite(limitValue) || (limitValue ?? 0) < 0)) return setError('Enter a valid credit limit.');
    const institutionId = makeId('manual-account');
    addAccount({
      institutionId,
      institution: 'Manual account',
      displayName: displayName.trim(),
      instrumentType,
      accountTail: tail.replace(/\D/g, '').slice(-8),
      creditLimit: limitValue,
    });
    router.replace('/(tabs)/accounts');
  };

  return (
    <Page scroll={false}>
      <PageHeader eyebrow="Optional manual record" title="Add a manual account" subtitle="For entries you record yourself. Imported bank alerts create account labels automatically." onBack={() => router.back()} />
      <KeyboardAwareScrollViewCompat
        bottomOffset={48}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 17, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <TextField label="Account name" value={displayName} onChangeText={setDisplayName} placeholder="e.g. Everyday account" />
        <View style={{ gap: 9 }}>
          <Text style={[sharedStyles.fieldLabel, { color: colors.foreground }]}>Account type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {instruments.map((instrument) => (
              <Pill key={instrument} label={instrument.replaceAll('_', ' ')} selected={instrumentType === instrument} onPress={() => setInstrumentType(instrument)} />
            ))}
          </View>
        </View>
        <TextField
          label="Last digits (optional)"
          value={tail}
          onChangeText={(value) => setTail(value.replace(/\D/g, '').slice(-8))}
          placeholder="For example, 0671"
          keyboardType="number-pad"
          maxLength={8}
          hint="Helps match an imported alert to the right account."
        />
        {instrumentType === 'CREDIT_CARD' ? (
          <TextField label="Credit limit (optional)" value={limit} onChangeText={setLimit} placeholder="₹0" keyboardType="decimal-pad" />
        ) : null}
        {error ? <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{error}</Text> : null}
        <ActionButton label="Save account" icon="check" onPress={save} />
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}
