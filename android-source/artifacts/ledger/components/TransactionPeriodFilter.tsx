import React from 'react';
import { View } from 'react-native';
import { Pill } from '@/components/LedgerUI';
import { transactionPeriods, TransactionPeriod } from '@/lib/analytics';

interface TransactionPeriodFilterProps {
  value: TransactionPeriod;
  onChange: (period: TransactionPeriod) => void;
}

export function TransactionPeriodFilter({ value, onChange }: TransactionPeriodFilterProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }} accessibilityLabel="Filter by date">
      {transactionPeriods.map((period) => (
        <Pill
          key={period.value}
          label={period.label}
          selected={value === period.value}
          onPress={() => onChange(period.value)}
        />
      ))}
    </View>
  );
}
