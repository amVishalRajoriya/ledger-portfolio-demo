import React from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ActionButton, Card, Notice, Page, PageHeader, SectionHeading } from '@/components/LedgerUI';

const steps = [
  {
    title: 'Create a message automation',
    body: 'In Apple Shortcuts, open Automation → New Personal Automation → Message. Choose the bank sender. Create one automation for each sender you want to import.',
  },
  {
    title: 'Let it run automatically',
    body: 'Choose Run Immediately. The automation can run without opening Ledger; iOS may still defer automations until the phone has been unlocked after a restart.',
  },
  {
    title: 'Add Ledger’s action',
    body: 'Add the “Log Bank Message” action. Set Message text to the incoming message and Sender ID to the sender. Leave Received at blank to use the time the automation ran.',
  },
  {
    title: 'Open Ledger to finish importing',
    body: 'The action saves a small file in Ledger’s protected local storage. The next time Ledger opens, it parses the queued messages on-device. Uncertain messages go to Review; no SMS is sent to a server.',
  },
];

export default function ShortcutsScreen() {
  const colors = useColors();
  const router = useRouter();
  const isAndroid = Platform.OS === 'android';

  return (
    <Page>
      <PageHeader
        eyebrow="On-device import"
        title={isAndroid ? 'Android message import' : 'iPhone Shortcuts'}
        subtitle={isAndroid
          ? 'Import alerts you choose by copying and pasting them. Ledger does not read your SMS inbox.'
          : 'Forward new bank alerts to Ledger; parsing happens locally when Ledger opens.'}
      />

      {isAndroid ? (
        <>
          <Notice tone="positive" icon="lock">
            No SMS permission is requested. Ledger only processes the alert you paste, on this device; it does not send messages to Gemini or a server.
          </Notice>
          <View style={{ gap: 12 }}>
            <SectionHeading title="Import a bank alert" subtitle="You stay in control of which message is shared with Ledger." />
            <Card style={{ gap: 8 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>1. Copy the complete alert from Messages</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>Include the sender text when your messaging app lets you copy it.</Text>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 7 }}>2. Paste it into Ledger and preview</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>Check the result before saving. Unclear bank alerts go to Review; ordinary purchases belong in manual entry.</Text>
            </Card>
          </View>
          <ActionButton label="Import a bank message" icon="message-square" onPress={() => router.push('/import')} />
          <Notice tone="neutral" icon="info">
            Older alerts work the same way: copy one message at a time. Ledger does not scan or import SMS history automatically.
          </Notice>
        </>
      ) : (
      <>
      <Notice tone="positive" icon="lock">
        iOS does not let Ledger read the Messages inbox. Shortcuts forwards only the message you choose, and this flow stores it locally without Gemini or a server.
      </Notice>

      <Notice tone="neutral" icon="info">
        Common INR transaction formats can work with new senders without bank-specific setup. Ledger labels a new institution by its SMS sender ID; unfamiliar formats go to Review.
      </Notice>

      <Notice tone="warning" icon="info">
        This action is available in an installed iOS build that includes Ledger’s native Shortcut intent. It is not available in the Replit preview or Expo Go.
      </Notice>

      <View style={{ gap: 12 }}>
        <SectionHeading title="Set up an automation" subtitle="Create one automation for each SMS sender you want to capture." />
        {steps.map((step, index) => (
          <Card key={step.title} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.secondary,
            }}>
              <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{step.title}</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>{step.body}</Text>
            </View>
          </Card>
        ))}
      </View>

      <Notice tone="warning" icon="inbox">
        Shortcuts only captures messages received after you create the automation. Use the in-app import screen for older messages. The automation never reads your SMS history.
      </Notice>
      </>
      )}
    </Page>
  );
}
