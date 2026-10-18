import React, { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { confirmAction } from '@/lib/confirmAction';
import { categorySpend, filterTransactionsByPeriod, monthTransactions, monthlySpend, totalsFor, TransactionPeriod } from '@/lib/analytics';
import { formatRupees, monthLabel } from '@/lib/ledger';
import {
  ActionButton, Card, EmptyState, IconButton, Notice, Page, PageHeader,
  SectionHeading, TransactionRow, categoryTint,
} from '@/components/LedgerUI';
import { TransactionPeriodFilter } from '@/components/TransactionPeriodFilter';

function Donut({ data, total }: { data: Array<{ amount: number; tint: string }>; total: number }) {
  const colors = useColors();
  const size = 108;
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.secondary} strokeWidth={stroke} />
        {data.map((item, index) => {
          const length = total > 0 ? item.amount / total * circumference : 0;
          const offset = -consumed;
          consumed += length;
          return <Circle key={`${index}-${item.tint}`} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={item.tint} strokeWidth={stroke} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={offset} />;
        })}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', gap: 1 }}>
        <Text style={{ fontFamily: 'Inter_700Bold', color: colors.foreground, fontSize: 14 }}>{formatRupees(total, true)}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', color: colors.mutedForeground, fontSize: 9 }}>spent</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const ledger = useLedger();
  const [recentPeriod, setRecentPeriod] = useState<TransactionPeriod>('MONTH');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthItems = useMemo(() => monthTransactions(ledger.transactions, year, month), [ledger.transactions, year, month]);
  const totals = useMemo(() => totalsFor(monthItems), [monthItems]);
  const day = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousSpend = monthlySpend(ledger.transactions, month === 0 ? year - 1 : year, (month + 11) % 12, day);
  const currentSpend = monthlySpend(ledger.transactions, year, month, day);
  const delta = currentSpend - previousSpend;
  const trend = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, month - 11 + index, 1);
    return { date, value: monthlySpend(ledger.transactions, date.getFullYear(), date.getMonth()), current: date.getFullYear() === year && date.getMonth() === month };
  });
  const maxTrend = Math.max(...trend.map((item) => item.value), 1);
  const categories = categorySpend(monthItems).slice(0, 5).map((item) => ({
    ...item, category: ledger.categories.find((category) => category.id === item.categoryId),
  }));
  const recent = useMemo(() => filterTransactionsByPeriod(ledger.transactions, recentPeriod, now)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5), [ledger.transactions, recentPeriod, year, month]);
  const topMerchants = Object.values(monthItems
    .filter((item) => item.direction === 'DEBIT' && !item.isExcludedFromTotals && item.merchantNormalized)
    .reduce<Record<string, { merchant: string; amount: number; count: number }>>((group, item) => {
      const key = item.merchantNormalized;
      group[key] ??= { merchant: item.merchantRaw || key, amount: 0, count: 0 };
      group[key].amount += item.amount;
      group[key].count++;
      return group;
    }, {})).sort((a, b) => b.amount - a.amount).slice(0, 4);
  const dailyRate = day ? totals.expenses / day : 0;
  const projection = dailyRate * daysInMonth;
  const dueCards = ledger.accounts.filter((account) => account.isActive && account.instrumentType === 'CREDIT_CARD' && account.dueAmount !== undefined);
  const openSample = () => {
    if (ledger.accounts.length || ledger.rawMessages.length || ledger.rules.length) {
      confirmAction({
        title: 'Replace the current ledger?',
        message: 'Loading examples will replace all accounts, messages, rules, and transactions currently stored on this device.',
        confirmLabel: 'Load sample data',
        onConfirm: ledger.loadDemo,
      });
      return;
    }
    ledger.loadDemo();
  };

  if (ledger.isLoading) return <Page tabbed><View style={{ minHeight: 320, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>Opening your private ledger…</Text></View></Page>;

  return (
    <Page tabbed>
      <PageHeader
        eyebrow={now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        title="Your money"
        right={<IconButton name="plus" label="Import a bank message" onPress={() => router.push('/import')} />}
      />
      {ledger.storageWarning ? <Notice tone="warning" icon="alert-triangle">{ledger.storageWarning}</Notice> : null}
      {ledger.demoMode ? <Notice tone="neutral" icon="eye">Example data is on. Clear it in Settings before entering your own records.</Notice> : null}
      {ledger.reviews.length > 0 ? (
        <Pressable onPress={() => router.push('/review')}>
          <Notice tone="warning" icon="inbox">
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>
              {ledger.reviews.length} message{ledger.reviews.length === 1 ? '' : 's'} need review. <Text style={{ color: colors.warning, fontFamily: 'Inter_600SemiBold' }}>Open inbox →</Text>
            </Text>
          </Notice>
        </Pressable>
      ) : null}
      {Platform.OS === 'android' ? (
        <ActionButton
          label="Import up to 3 months of SMS"
          icon="download"
          secondary
          onPress={() => router.push('/history-import')}
          testID="dashboard-history-import"
        />
      ) : null}

      {ledger.transactions.length === 0 ? (
        <Card style={{ padding: 20, backgroundColor: colors.primary, borderColor: colors.primary, gap: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="book-open" size={21} color={colors.accentForeground} />
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 }}>A clearer picture, on your terms.</Text>
            <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 }}>
              Import an alert or add a transaction by hand. Imported alerts create account labels automatically; your ledger stays on this device.
            </Text>
          </View>
          <ActionButton
            label="Import a bank message"
            icon="message-square"
            onPress={() => router.push('/import')}
            secondary
            style={{ backgroundColor: colors.accent, borderColor: colors.accent }}
          />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <ActionButton label="Add manually" icon="plus" secondary onPress={() => router.push('/new')} style={{ flex: 1 }} />
            <ActionButton label="Explore sample" icon="eye" secondary onPress={openSample} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <>
          <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, padding: 19, gap: 17 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 3 }}>
                <Text style={{ color: colors.primaryForeground, opacity: 0.75, fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{monthLabel(now)}</Text>
                <Text style={{ color: colors.accent, fontFamily: 'Inter_700Bold', fontSize: 13 }}>MONTH TO DATE</Text>
              </View>
              <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.accent }}>
                <Text style={{ color: colors.accentForeground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>{daysInMonth - day} days left</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7 }}>
              {([
                ['Income', formatRupees(totals.income, true), colors.primaryForeground],
                ['Spent', formatRupees(totals.expenses, true), colors.primaryForeground],
                ['Net', formatRupees(totals.net, true), totals.net >= 0 ? colors.accent : colors.primaryForeground],
              ] as Array<[string, string, string]>).map(([label, value, tint]) => (
                <View key={label} style={{ flex: 1, gap: 5, alignItems: label === 'Net' ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ color: colors.primaryForeground, opacity: 0.72, fontFamily: 'Inter_400Regular', fontSize: 10 }}>{label}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: tint, fontFamily: 'Inter_700Bold', fontSize: 15 }}>{value}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 }}>
            <Feather name={delta > 0 ? 'trending-up' : 'trending-down'} size={18} color={delta > 0 ? colors.warning : colors.positive} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>
                {delta === 0 ? 'Same spend as last month so far' : `${formatRupees(Math.abs(delta), true)} ${delta > 0 ? 'more' : 'less'} than last month`}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Compared through day {day} of the month</Text>
            </View>
            <Text style={{ color: delta > 0 ? colors.warning : colors.positive, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>
              {previousSpend > 0 ? `${delta > 0 ? '+' : ''}${Math.round(delta / previousSpend * 100)}%` : '—'}
            </Text>
          </Card>

          <View>
            <SectionHeading title="Spending rhythm" action="Insights" onAction={() => router.push('/(tabs)/insights')} />
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 91, gap: 6 }}>
                {trend.map((item, index) => (
                  <View key={`${item.date.toISOString()}-${index}`} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 5 }}>
                    <View style={{
                      width: '100%', minHeight: 3, height: Math.max(3, item.value / maxTrend * 66),
                      borderRadius: 5, backgroundColor: item.current ? colors.accent : colors.chart1,
                      opacity: item.value === 0 ? 0.2 : item.current ? 1 : 0.6,
                    }} />
                    <Text style={{ color: item.current ? colors.foreground : colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 8 }}>
                      {item.date.toLocaleDateString('en-IN', { month: 'short' }).slice(0, 1)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Last 12 months</Text>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>Projected {formatRupees(projection, true)}</Text>
              </View>
            </Card>
          </View>

          <View>
            <SectionHeading title="Where it went" action="Details" onAction={() => router.push('/(tabs)/insights')} subtitle="Spending by category" />
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Donut data={categories.map((item) => ({ amount: item.amount, tint: categoryTint(item.category, colors) }))} total={totals.expenses} />
              <View style={{ flex: 1, gap: 9 }}>
                {categories.length === 0 ? (
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 }}>No spending to group yet.</Text>
                ) : categories.map((item) => (
                  <View key={item.categoryId} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: categoryTint(item.category, colors) }} />
                    <Text numberOfLines={1} style={{ flex: 1, color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 9 }}>{item.category?.name ?? 'Other'}</Text>
                    <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 9 }}>{formatRupees(item.amount, true)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>

          {dueCards.length > 0 ? (
            <View>
              <SectionHeading title="Card watch" action="Accounts" onAction={() => router.push('/(tabs)/accounts')} />
              {dueCards.map((account) => {
                const remaining = account.dueDate ? Math.ceil((new Date(account.dueDate).getTime() - Date.now()) / 86400000) : undefined;
                return (
                  <Card key={account.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="credit-card" size={17} color={colors.accentForeground} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{account.displayName}</Text>
                      <Text style={{ color: remaining !== undefined && remaining <= 5 ? colors.warning : colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>
                        {remaining === undefined ? 'Due date not set' : remaining < 0 ? `Overdue by ${Math.abs(remaining)} days` : remaining === 0 ? 'Due today' : `Due in ${remaining} days`}
                      </Text>
                    </View>
                    <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{formatRupees(account.dueAmount ?? 0, true)}</Text>
                  </Card>
                );
              })}
            </View>
          ) : null}

          <View>
            <SectionHeading title="Daily pace" subtitle={`${formatRupees(dailyRate, true)} average per day so far`} />
            <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Projected month-end</Text>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 19 }}>{formatRupees(projection, true)}</Text>
              </View>
              <Feather name="activity" size={21} color={colors.primary} />
            </Card>
          </View>

          <View>
            <SectionHeading title="Top merchants" action="Ledger" onAction={() => router.push('/(tabs)/activity')} />
            <Card style={{ gap: 12 }}>
              {topMerchants.length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 }}>Merchant totals appear as transactions arrive.</Text>
              ) : topMerchants.map((item, index) => (
                <View key={item.merchant} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Text style={{ width: 18, color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>0{index + 1}</Text>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>{item.merchant}</Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 9 }}>{item.count} {item.count === 1 ? 'payment' : 'payments'}</Text>
                  </View>
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>{formatRupees(item.amount, true)}</Text>
                </View>
              ))}
            </Card>
          </View>

          <View>
            <SectionHeading title="Recent activity" action="See all" onAction={() => router.push('/(tabs)/activity')} />
            <TransactionPeriodFilter value={recentPeriod} onChange={setRecentPeriod} />
            <Card style={{ paddingVertical: 5, gap: 1 }}>
              {recent.length > 0 ? recent.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={ledger.categories.find((item) => item.id === transaction.categoryId)}
                  accountLabel={ledger.accounts.find((item) => item.id === transaction.accountId)?.displayName}
                  onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } })}
                />
              )) : <EmptyState title={`No activity ${recentPeriod === 'MONTH' ? 'this month' : recentPeriod === 'YEAR' ? 'this year' : 'yet'}`} body="Your transactions will appear here." />}
            </Card>
          </View>
        </>
      )}

    </Page>
  );
}
