import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { filterTransactionsByPeriod, TransactionPeriod, transactionPeriodLabel } from '@/lib/analytics';
import { formatRupees } from '@/lib/ledger';
import { ActionButton, Card, EmptyState, Page, PageHeader, SectionHeading } from '@/components/LedgerUI';
import { TransactionPeriodFilter } from '@/components/TransactionPeriodFilter';

export default function AccountsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { accounts, transactions } = useLedger();
  const activeAccounts = accounts.filter((account) => account.isActive);
  const [period, setPeriod] = useState<TransactionPeriod>('MONTH');
  const now = new Date();

  return (
    <Page tabbed>
      <PageHeader
        eyebrow="Your financial picture"
        title="Accounts"
        subtitle="Imported SMS alerts create account labels automatically. Add a manual account only for entries you record yourself."
        right={<ActionButton label="Add manual" icon="plus" onPress={() => router.push('/account/new')} />}
      />
      <SectionHeading title={`${activeAccounts.length} ${activeAccounts.length === 1 ? 'account' : 'accounts'}`} />
      {activeAccounts.length > 0 ? <TransactionPeriodFilter value={period} onChange={setPeriod} /> : null}
      {activeAccounts.length === 0 ? (
        <Card>
          <EmptyState
            icon="credit-card"
            title="Accounts appear as alerts arrive"
            body="Ledger creates account labels from imported SMS. Add a manual account only if you want to organize entries you record yourself."
            action={<ActionButton label="Add manual account" icon="plus" onPress={() => router.push('/account/new')} />}
          />
        </Card>
      ) : activeAccounts.map((account) => {
        const accountTransactions = transactions.filter((item) => item.accountId === account.id);
        const periodTransactions = filterTransactionsByPeriod(accountTransactions, period, now);
        const debits = periodTransactions.filter((item) => item.direction === 'DEBIT' && !item.isExcludedFromTotals).reduce((sum, item) => sum + item.amount, 0);
        const credits = periodTransactions.filter((item) => item.direction === 'CREDIT' && !item.isExcludedFromTotals && item.channel !== 'REVERSAL').reduce((sum, item) => sum + item.amount, 0);
        const dueDays = account.dueDate ? Math.ceil((new Date(account.dueDate).getTime() - Date.now()) / 86400000) : undefined;
        return (
          <Card key={account.id} style={{ gap: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 47, height: 47, borderRadius: 16,
                backgroundColor: account.instrumentType === 'CREDIT_CARD' ? colors.accent : colors.secondary,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Feather name={account.instrumentType === 'CREDIT_CARD' ? 'credit-card' : 'briefcase'} size={19} color={account.instrumentType === 'CREDIT_CARD' ? colors.accentForeground : colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{account.displayName}</Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 }}>
                  {account.institution} ··{account.accountTail || '—'} · {account.instrumentType.replaceAll('_', ' ')}
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>{transactionPeriodLabel(period)} out</Text>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{formatRupees(debits, true)}</Text>
              </View>
              <View style={{ flex: 1, gap: 4, alignItems: 'flex-end' }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>{transactionPeriodLabel(period)} in</Text>
                <Text style={{ color: colors.positive, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{formatRupees(credits, true)}</Text>
              </View>
            </View>
            {account.instrumentType === 'CREDIT_CARD' ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 11, borderRadius: 13, backgroundColor: colors.secondary }}>
                <View style={{ gap: 3 }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Current due</Text>
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{formatRupees(account.dueAmount ?? 0, true)}</Text>
                </View>
                <Text style={{ color: dueDays !== undefined && dueDays <= 5 ? colors.warning : colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 }}>
                  {dueDays === undefined ? 'No due date' : dueDays < 0 ? `Overdue ${Math.abs(dueDays)}d` : dueDays === 0 ? 'Due today' : `${dueDays} days left`}
                </Text>
              </View>
            ) : null}
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>
              {accountTransactions.length} {accountTransactions.length === 1 ? 'transaction' : 'transactions'} saved locally
            </Text>
          </Card>
        );
      })}
      <Card style={{ backgroundColor: colors.secondary }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Feather name="lock" size={16} color={colors.primary} />
          <Text style={{ flex: 1, color: colors.secondaryForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19 }}>
            Balances are intentionally not shown. Bank SMS rarely include a reliable, up-to-date balance.
          </Text>
        </View>
      </Card>
    </Page>
  );
}
