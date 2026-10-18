import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { categorySpend, monthTransactions, totalsFor } from '@/lib/analytics';
import { formatRupees } from '@/lib/ledger';
import { Card, EmptyState, Page, PageHeader, Pill, SectionHeading, TransactionRow, categoryTint } from '@/components/LedgerUI';

export default function InsightsScreen() {
  const colors = useColors();
  const router = useRouter();
  const chartTints = [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5, colors.chart6, colors.chart7, colors.chart8];
  const ledger = useLedger();
  const now = new Date();
  const startYear = ledger.fyMode && now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const startMonth = ledger.fyMode ? 3 : 0;
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const date = new Date(startYear, startMonth + index, 1);
    const items = monthTransactions(ledger.transactions, date.getFullYear(), date.getMonth());
    return { date, ...totalsFor(items) };
  }), [ledger.transactions, startYear, startMonth]);
  const yearItems = ledger.transactions.filter((item) => {
    const date = new Date(item.occurredAt);
    const start = new Date(startYear, startMonth, 1);
    const end = new Date(startYear + 1, startMonth, 1);
    return date >= start && date < end;
  });
  const totals = totalsFor(yearItems);
  const savingsRate = totals.income > 0 ? Math.max(0, totals.net / totals.income * 100) : 0;
  const maxMonth = Math.max(...months.map((item) => item.expenses), 1);
  const categories = categorySpend(yearItems).slice(0, 8).map((item) => ({
    ...item,
    category: ledger.categories.find((category) => category.id === item.categoryId),
  }));
  const instrumentGroups = (['BANK_ACCOUNT', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'WALLET'] as const).map((instrument) => ({
    instrument,
    amount: yearItems.filter((item) => item.instrument === instrument && item.direction === 'DEBIT' && !item.isExcludedFromTotals)
      .reduce((sum, item) => sum + item.amount, 0),
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const dayGroups = Array.from({ length: 7 }, (_, index) => {
    const amount = yearItems.filter((item) => item.direction === 'DEBIT' && !item.isExcludedFromTotals && new Date(item.occurredAt).getDay() === index)
      .reduce((sum, item) => sum + item.amount, 0);
    return { label: new Date(2024, 0, 7 + index).toLocaleDateString('en-IN', { weekday: 'short' }), amount };
  });
  const maxDay = Math.max(...dayGroups.map((item) => item.amount), 1);
  const largest = [...yearItems].filter((item) => item.direction === 'DEBIT' && !item.isExcludedFromTotals)
    .sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <Page tabbed>
      <PageHeader eyebrow="Patterns, not guesses" title="Insights" subtitle="Built from the transactions stored on this device." />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pill label="Calendar year" selected={!ledger.fyMode} onPress={() => ledger.fyMode && ledger.toggleFyMode()} />
        <Pill label="Indian FY · Apr–Mar" selected={ledger.fyMode} onPress={() => !ledger.fyMode && ledger.toggleFyMode()} />
      </View>

      {ledger.transactions.length === 0 ? (
        <Card>
          <EmptyState icon="bar-chart-2" title="Insights need a little history" body="Import or add transactions to see your year at a glance. Try the sample ledger to explore the charts." />
        </Card>
      ) : (
        <>
          <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, gap: 17 }}>
            <View style={{ gap: 3 }}>
              <Text style={{ color: colors.primaryForeground, opacity: 0.7, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1 }}>
                {ledger.fyMode ? `FY ${startYear}–${String(startYear + 1).slice(-2)}` : String(startYear)}
              </Text>
              <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 25 }}>{formatRupees(totals.net, true)}</Text>
              <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontFamily: 'Inter_400Regular', fontSize: 11 }}>Net saved · {Math.round(savingsRate)}% savings rate</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.primaryForeground, opacity: 0.18 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.primaryForeground, opacity: 0.7, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Income</Text>
                <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{formatRupees(totals.income, true)}</Text>
              </View>
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                <Text style={{ color: colors.primaryForeground, opacity: 0.7, fontFamily: 'Inter_400Regular', fontSize: 10 }}>Spending</Text>
                <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>{formatRupees(totals.expenses, true)}</Text>
              </View>
            </View>
          </Card>

          <View>
            <SectionHeading title="Month by month" subtitle="Spending across this year" />
            <Card style={{ gap: 13 }}>
              {months.map((item) => {
                const thisMonth = item.date.getMonth() === now.getMonth() && item.date.getFullYear() === now.getFullYear();
                return (
                  <View key={item.date.toISOString()} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <Text style={{ width: 30, color: thisMonth ? colors.foreground : colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10 }}>
                      {item.date.toLocaleDateString('en-IN', { month: 'short' })}
                    </Text>
                    <View style={{ flex: 1, height: 9, backgroundColor: colors.secondary, borderRadius: 6, overflow: 'hidden' }}>
                      <View style={{
                        height: 9, width: `${Math.min(100, Math.max(2, item.expenses / maxMonth * 100))}%`,
                        borderRadius: 6, backgroundColor: thisMonth ? colors.accent : colors.primary,
                        opacity: item.expenses > 0 ? 0.85 : 0.15,
                      }} />
                    </View>
                    <Text style={{ width: 64, textAlign: 'right', color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>
                      {formatRupees(item.expenses, true)}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>

          <View>
            <SectionHeading title="Categories" subtitle="Net spend after linked refunds" />
            <Card style={{ gap: 14 }}>
              {categories.length ? categories.map((item) => {
                const tint = categoryTint(item.category, colors);
                return (
                  <View key={item.categoryId} style={{ gap: 7 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{item.category?.name ?? 'Other'}</Text>
                      <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{formatRupees(item.amount, true)}</Text>
                    </View>
                    <View style={{ height: 5, borderRadius: 5, backgroundColor: colors.secondary, overflow: 'hidden' }}>
                      <View style={{ height: 5, width: `${totals.expenses > 0 ? Math.max(2, item.amount / totals.expenses * 100) : 0}%`, backgroundColor: tint, borderRadius: 5 }} />
                    </View>
                  </View>
                );
              }) : <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>No spending in this period.</Text>}
            </Card>
          </View>

          {instrumentGroups.length > 0 ? (
            <View>
              <SectionHeading title="Spend by instrument" />
              <Card style={{ gap: 12 }}>
                {instrumentGroups.map((item, index) => (
                  <View key={item.instrument} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: chartTints[index % chartTints.length] }} />
                    <Text style={{ flex: 1, color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 11 }}>{item.instrument.replaceAll('_', ' ')}</Text>
                    <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>{formatRupees(item.amount, true)}</Text>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          <View>
            <SectionHeading title="Spend by weekday" />
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 142, paddingBottom: 14 }}>
              {dayGroups.map((item, index) => (
                <View key={item.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8, height: '100%' }}>
                  <View style={{
                    width: 17, height: Math.max(3, item.amount / maxDay * 76), borderRadius: 6,
                    backgroundColor: chartTints[index],
                    opacity: item.amount > 0 ? 0.8 : 0.18,
                  }} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 9 }}>{item.label}</Text>
                </View>
              ))}
            </Card>
          </View>

          <View>
            <SectionHeading title="Largest transactions" />
            <Card style={{ paddingVertical: 4, gap: 1 }}>
              {largest.length ? largest.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={ledger.categories.find((category) => category.id === transaction.categoryId)}
                  onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } })}
                />
              )) : <EmptyState title="No large expenses yet" body="Larger transactions will appear here." />}
            </Card>
          </View>
        </>
      )}
    </Page>
  );
}
