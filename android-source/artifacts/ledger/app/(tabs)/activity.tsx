import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { formatRupees, localDateKey } from '@/lib/ledger';
import { filterTransactionsByPeriod, totalsFor, TransactionPeriod, transactionPeriodLabel } from '@/lib/analytics';
import { TransactionPeriodFilter } from '@/components/TransactionPeriodFilter';
import {
  Card,
  EmptyState,
  IconButton,
  Page,
  PageHeader,
  Pill,
  SectionHeading,
  TransactionRow,
} from '@/components/LedgerUI';

type Filter = 'ALL' | 'DEBIT' | 'CREDIT' | 'CREDIT_CARD';

export default function ActivityScreen() {
  const colors = useColors();
  const router = useRouter();
  const { transactions, categories, accounts, reviews } = useLedger();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [period, setPeriod] = useState<TransactionPeriod>('ALL');
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return filterTransactionsByPeriod(transactions, period)
      .filter((item) => filter === 'ALL' || (filter === 'CREDIT_CARD' ? item.instrument === 'CREDIT_CARD' : item.direction === filter))
      .filter((item) => {
        if (!text) return true;
        const category = categories.find((cat) => cat.id === item.categoryId)?.name ?? '';
        const account = accounts.find((accountItem) => accountItem.id === item.accountId)?.displayName ?? '';
        return `${item.merchantRaw} ${item.merchantNormalized} ${category} ${account} ${item.note ?? ''} ${item.amount}`.toLowerCase().includes(text);
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [transactions, categories, accounts, query, filter, period]);
  const dailyGroups = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const item of filtered) {
      const key = localDateKey(item.occurredAt);
      groups[key] ??= [];
      groups[key].push(item);
    }
    return Object.entries(groups);
  }, [filtered]);
  const summary = totalsFor(filtered);

  return (
    <Page tabbed>
      <PageHeader
        eyebrow="Every entry, accounted for"
        title="Ledger"
        right={<IconButton name="plus" label="Add transaction" onPress={() => router.push('/new')} />}
      />
      {reviews.length > 0 ? (
        <Pressable onPress={() => router.push('/review')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <Feather name="inbox" size={17} color={colors.warning} />
            <Text style={{ flex: 1, color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{reviews.length} messages waiting in Review Inbox</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Card>
        </Pressable>
      ) : null}

      <View style={{
        minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.input,
        backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9,
      }}>
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search merchant, category or note"
          placeholderTextColor={colors.mutedForeground}
          style={{ flex: 1, color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 13, minHeight: 46 }}
          returnKeyType="search"
          accessibilityLabel="Search transactions"
        />
        {query ? <IconButton name="x" label="Clear search" onPress={() => setQuery('')} /> : null}
      </View>
      <TransactionPeriodFilter value={period} onChange={setPeriod} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {([
          ['ALL', 'All'],
          ['DEBIT', 'Expenses'],
          ['CREDIT', 'Income'],
          ['CREDIT_CARD', 'Card'],
        ] as Array<[Filter, string]>).map(([key, label]) => (
          <Pill key={key} label={label} selected={filter === key} onPress={() => setFilter(key)} />
        ))}
      </View>
      <Card style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Filtered spend</Text>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{formatRupees(summary.expenses, true)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Income</Text>
          <Text style={{ color: colors.positive, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{formatRupees(summary.income, true)}</Text>
        </View>
      </Card>
      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon="list"
            title="Your ledger starts here"
            body="Import a bank message or add a cash transaction. Search and filters will be ready as entries arrive."
            action={<View style={{ flexDirection: 'row', gap: 9, marginTop: 7 }}>
              <Text onPress={() => router.push('/import')} style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>Import SMS</Text>
              <Text style={{ color: colors.mutedForeground }}>·</Text>
              <Text onPress={() => router.push('/new')} style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>Manual entry</Text>
            </View>}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon="search" title="No matches" body="Try a different merchant name or filter." /></Card>
      ) : dailyGroups.map(([date, entries]) => {
        const dateTotals = totalsFor(entries);
        return (
          <View key={date}>
            <SectionHeading
              title={new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
              action={formatRupees(dateTotals.expenses, true)}
            />
            <Card style={{ paddingVertical: 5, gap: 1 }}>
              {entries.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={categories.find((category) => category.id === transaction.categoryId)}
                  accountLabel={accounts.find((account) => account.id === transaction.accountId)?.displayName}
                  onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } })}
                />
              ))}
            </Card>
          </View>
        );
      })}
      {transactions.length > 0 ? (
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', paddingTop: 2 }}>
          {filtered.length} of {transactions.length} transactions · {transactionPeriodLabel(period)}
        </Text>
      ) : null}
    </Page>
  );
}
