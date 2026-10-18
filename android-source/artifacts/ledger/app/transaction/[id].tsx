import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { formatRupees } from '@/lib/ledger';
import { confirmAction } from '@/lib/confirmAction';
import { ActionButton, Card, Notice, Page, PageHeader, Pill, sharedStyles } from '@/components/LedgerUI';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { transactions, accounts, categories, rules, updateTransaction, removeTransaction, createRule } = useLedger();
  const [message, setMessage] = useState('');
  const transaction = useMemo(() => transactions.find((item) => item.id === id), [transactions, id]);
  if (!transaction) {
    return (
      <Page>
        <PageHeader title="Transaction not found" onBack={() => router.back()} />
        <Notice tone="warning" icon="alert-circle">This entry may have been removed.</Notice>
      </Page>
    );
  }
  const category = categories.find((item) => item.id === transaction.categoryId);
  const account = accounts.find((item) => item.id === transaction.accountId);
  const originalRule = rules.find((item) => transaction.merchantNormalized.startsWith(item.merchantPrefix));

  const saveRule = () => {
    if (!transaction.merchantNormalized) {
      setMessage('This entry has no merchant to use for a rule.');
      return;
    }
    createRule(transaction.merchantNormalized, transaction.categoryId);
    setMessage(`Future and past ${transaction.merchantRaw || 'matching'} transactions now use ${category?.name ?? 'this category'}.`);
  };

  const confirmDelete = () => {
    confirmAction({
      title: 'Delete this transaction?',
      message: 'It will be removed from your local ledger.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        removeTransaction(transaction.id);
        router.back();
      },
    });
  };

  return (
    <Page>
      <PageHeader eyebrow="Transaction" title={transaction.merchantRaw || 'Details'} onBack={() => router.back()} />
      <Card style={{ paddingVertical: 22, gap: 12 }}>
        <Text style={{ color: transaction.direction === 'CREDIT' ? colors.positive : colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -1 }}>
          {transaction.direction === 'CREDIT' ? '+' : '−'}{formatRupees(transaction.amount)}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 }}>
          {new Date(transaction.occurredAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          <Pill label={transaction.instrument.replaceAll('_', ' ')} />
          <Pill label={transaction.channel.replaceAll('_', ' ')} />
          {transaction.linkType ? <Pill label={transaction.linkType.replaceAll('_', ' ')} selected /> : null}
        </View>
        {account ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>
            {account.institution} · {account.displayName} ··{account.accountTail}
          </Text>
        ) : null}
        {transaction.referenceNumber ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 }}>
            Reference {transaction.referenceNumber}
          </Text>
        ) : null}
        {transaction.isExcludedFromTotals ? (
          <Notice tone="neutral" icon="link">Linked transfer, card payment or adjustment. Excluded from income and spending totals.</Notice>
        ) : null}
      </Card>

      <View style={{ gap: 9 }}>
        <Text style={[sharedStyles.fieldLabel, { color: colors.foreground }]}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((item) => (
            <Pill
              key={item.id}
              label={item.name}
              selected={transaction.categoryId === item.id}
              onPress={() => {
                updateTransaction(transaction.id, { categoryId: item.id, isUserVerified: true });
                setMessage(`Changed to ${item.name}.`);
              }}
            />
          ))}
        </View>
      </View>

      <ActionButton
        label={originalRule ? `Rule: ${originalRule.merchantPrefix}` : 'Use this category for this merchant'}
        icon="repeat"
        secondary
        onPress={saveRule}
      />
      {message ? <Text style={{ color: colors.positive, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{message}</Text> : null}
      <ActionButton label="Delete transaction" icon="trash-2" secondary onPress={confirmDelete} />
    </Page>
  );
}
