import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { confirmAction } from '@/lib/confirmAction';
import { ActionButton, Card, Notice, Page, PageHeader, SectionHeading } from '@/components/LedgerUI';

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{title}</Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 }}>{subtitle}</Text>
      </View>
      {trailing ?? (onPress ? <Feather name="chevron-right" size={15} color={colors.mutedForeground} /> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const ledger = useLedger();
  const isAndroid = Platform.OS === 'android';

  const reset = () => {
    confirmAction({
      title: 'Clear this device’s ledger?',
      message: 'This permanently removes local transactions, accounts, rules, and imported messages. This cannot be undone.',
      confirmLabel: 'Clear everything',
      destructive: true,
      onConfirm: ledger.clearLedger,
    });
  };

  const clearSample = () => {
    confirmAction({
      title: 'Clear the local ledger?',
      message: 'This permanently removes the example data and any accounts or transactions added afterward. This cannot be undone.',
      confirmLabel: 'Clear all local data',
      destructive: true,
      onConfirm: ledger.clearLedger,
    });
  };

  return (
    <Page tabbed>
      <PageHeader eyebrow="Your device, your data" title="Settings" subtitle="Private by design. No bank sign-in." />
      {ledger.storageWarning ? <Notice tone="warning" icon="alert-triangle">{ledger.storageWarning}</Notice> : null}

      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="lock" size={18} color={colors.accentForeground} />
          </View>
          <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Stored only on this device</Text>
        </View>
        <Text style={{ color: colors.primaryForeground, opacity: 0.82, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19 }}>
          Ledger does not connect to your bank, sync to a cloud account, or send your transaction data to a server.
        </Text>
      </Card>

      <View>
        <SectionHeading title="Import & review" />
        <Card style={{ paddingVertical: 7, gap: 4 }}>
          <SettingRow icon="message-square" title="Import a bank SMS" subtitle="Common INR formats work with new senders too" onPress={() => router.push('/import')} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingRow
            icon={isAndroid ? 'message-square' : 'zap'}
            title={isAndroid ? 'Message import' : 'Shortcuts automation'}
            subtitle={isAndroid ? 'Copy and paste bank alerts; Ledger does not scan SMS' : 'Automatically save bank alerts on this iPhone'}
            onPress={() => router.push('/shortcuts')}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingRow icon="inbox" title="Review inbox" subtitle={`${ledger.reviews.length} messages need attention`} onPress={() => router.push('/review')} trailing={
            ledger.reviews.length > 0 ? (
              <View style={{ minWidth: 23, height: 23, borderRadius: 99, paddingHorizontal: 6, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 10 }}>{ledger.reviews.length}</Text>
              </View>
            ) : <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
          } />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingRow icon="credit-card" title="Accounts" subtitle={`${ledger.accounts.length} account${ledger.accounts.length === 1 ? '' : 's'} stored locally`} onPress={() => router.push('/(tabs)/accounts')} />
        </Card>
      </View>

      {ledger.shortcutImportWarning ? (
        <Notice tone="warning" icon="alert-triangle">{ledger.shortcutImportWarning}</Notice>
      ) : null}

      {ledger.rules.length > 0 ? (
        <View>
          <SectionHeading title="Your category rules" subtitle="Applied to matching past and future entries" />
          <Card style={{ gap: 11 }}>
            {ledger.rules.map((rule) => {
              const category = ledger.categories.find((item) => item.id === rule.categoryId);
              return (
                <View key={rule.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <Feather name="repeat" size={14} color={colors.primary} />
                  <Text style={{ flex: 1, color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 11 }}>{rule.merchantPrefix}</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 }}>{category?.name ?? 'Uncategorised'}</Text>
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {ledger.demoMode ? (
        <ActionButton label="Clear example and local data" icon="trash-2" secondary onPress={clearSample} />
      ) : null}
      <View>
        <SectionHeading title="Data management" />
        <Card style={{ gap: 10 }}>
          <SettingRow
            icon="smartphone"
            title="Local storage"
            subtitle="Ledger’s iOS file protection is active only in a standalone iPhone build; it is not included in Expo Go or the web preview."
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingRow icon="trash-2" title="Clear all data" subtitle="Permanently remove this local ledger" onPress={reset} trailing={<Feather name="chevron-right" size={15} color={colors.destructive} />} />
        </Card>
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 16, textAlign: 'center', paddingHorizontal: 12 }}>
        Ledger is a personal record-keeping tool, not financial advice. Check your bank’s records for final balances and payment status.
      </Text>
    </Page>
  );
}
