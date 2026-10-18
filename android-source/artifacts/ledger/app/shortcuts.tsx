import React from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ActionButton, Card, Notice, Page, PageHeader, SectionHeading } from '@/components/LedgerUI';

const steps = [
  {
    title: 'Choose an import method',
    body: 'Enable Android notification access for new bank alerts, or grant SMS permission to scan the last 90 days.',
  },
  {
    title: 'Review uncertain alerts',
    body: 'Suspicious live alerts and all matches from older SMS history go to Review. They cannot affect totals until you approve them.',
  },
  {
    title: 'Keep a portable backup',
    body: 'Create a local backup file in Settings and keep it in a private folder. Restore that file after reinstalling Ledger.',
  },
];

export default function ShortcutsScreen() {
  const colors = useColors();
  const router = useRouter();
  return (
    <Page>
      <PageHeader
        eyebrow="On-device import"
        title="Android message import"
        subtitle="Choose how to import alerts. Message processing stays on your device."
      />

      <>
          <Notice tone="positive" icon="lock">
            Android notification access can expose notification contents. SMS history scanning requests separate permission. Both are optional and process messages locally.
          </Notice>
          <View style={{ gap: 12 }}>
            <SectionHeading title="Choose an import method" subtitle="You can use one method or keep importing messages manually." />
            <Card style={{ gap: 8 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>New bank alerts</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>Turn on notification import in Settings. Suspicious messages go to Review before they affect your dashboard.</Text>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>1. Copy the complete alert from Messages</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>Include the sender text when your messaging app lets you copy it.</Text>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 7 }}>2. Paste it into Ledger and preview</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>Check the result before saving. Unclear alerts go to Review; ordinary purchases belong in manual entry.</Text>
            </Card>
          </View>
          <ActionButton label="Import up to 3 months of SMS" icon="clock" secondary testID="open-history-import" onPress={() => router.push('/history-import')} />
          <ActionButton label="Manage automatic bank alerts" icon="bell" secondary testID="android-import-settings" onPress={() => router.push('/(tabs)/settings')} />
          <ActionButton label="Import a bank message" icon="message-square" onPress={() => router.push('/import')} />
          <View style={{ gap: 12 }}>
            <SectionHeading title="Import from Android SMS history" subtitle="Scan up to 90 days after you grant permission. Every possible match goes to Review first." />
            {steps.map((step, index) => (
              <Card key={step.title} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary }}>
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{step.title}</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>{step.body}</Text>
                </View>
              </Card>
            ))}
          </View>
          <Notice tone="warning" icon="lock">
            A backup file contains sensitive financial data and is not encrypted. Store it privately and do not share it.
          </Notice>
      </>
    </Page>
  );
}
