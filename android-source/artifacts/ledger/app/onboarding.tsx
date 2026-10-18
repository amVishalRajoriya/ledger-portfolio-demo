import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActionButton, Card, Notice, Page, PageHeader } from '@/components/LedgerUI';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';

const nativeSetupSteps = [
  {
    title: 'Create a Messages automation',
    body: 'In Shortcuts, open Automation → New Personal Automation → Message, then choose the bank sender. Make one automation for each sender you want to capture.',
  },
  {
    title: 'Let it run automatically',
    body: 'Choose Run Immediately. iOS may defer automations until the iPhone has been unlocked after a restart.',
  },
  {
    title: 'Add Ledger’s action',
    body: 'Add “Log Bank Message”. Set Message text to the incoming message and Sender ID to the sender. Leave Received at blank if Shortcuts does not provide a timestamp.',
  },
  {
    title: 'Open Ledger to import',
    body: 'Ledger parses the queued message on this iPhone. Uncertain messages go to Review. Existing SMS history is not read; import older messages manually.',
  },
];

const androidSetupSteps = [
  {
    title: 'Copy a bank alert',
    body: 'Open your Messages app and copy the complete transaction alert you want to import.',
  },
  {
    title: 'Paste it into Ledger',
    body: 'Choose Import a bank message and paste the alert. Ledger does not ask to read your SMS inbox or history.',
  },
  {
    title: 'Check the preview',
    body: 'Review the amount, date, and account details before saving. Messages Ledger cannot confidently identify stay in Review.',
  },
  {
    title: 'Keep control of your data',
    body: 'Import and parsing happen on this device. Use manual entry for transactions that did not come from a bank alert.',
  },
];

const previewSteps = [
  {
    title: 'Start with example data',
    body: 'Open the home screen and tap Explore sample to see fictional transactions, accounts, and insights.',
  },
  {
    title: 'Try a bank-message import',
    body: 'Paste a sample alert manually. Ledger parses it in this app; anything unclear can be checked in Review.',
  },
  {
    title: 'Explore the ledger',
    body: 'Search transactions, change date and type filters, and review the account and insight screens.',
  },
  {
    title: 'Keep this preview fictional',
    body: 'This preview stores data in the browser or Expo Go on this device. It does not use the native iOS file protection. Do not enter real financial messages.',
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const { completeOnboarding } = useLedger();
  const [saving, setSaving] = useState(false);
  const isPreview =
    Platform.OS === 'web' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const isAndroid = Platform.OS === 'android';
  const steps = isPreview ? previewSteps : isAndroid ? androidSetupSteps : nativeSetupSteps;

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const saved = await completeOnboarding();
    setSaving(false);
    if (saved) router.replace('/(tabs)');
  };

  return (
    <Page>
      <PageHeader
        eyebrow={isPreview ? 'Ledger demo' : 'Welcome to Ledger'}
        title={isPreview ? 'Explore Ledger privately' : 'Import bank alerts privately'}
        subtitle={
          isPreview
            ? 'Try the ledger, message parser, and insights with fictional data. No bank sign-in or server is needed.'
            : isAndroid
              ? 'Import bank alerts by copying and pasting them. Ledger processes messages on this Android device without SMS inbox access.'
              : 'One-time setup forwards new alerts through Apple Shortcuts. Ledger processes them on this iPhone.'
        }
      />

      <Notice tone={isPreview ? 'warning' : 'positive'} icon={isPreview ? 'smartphone' : 'lock'}>
        {isPreview
          ? 'The native Messages Shortcut and iOS file protection are not active in this web or Expo Go preview.'
          : isAndroid
            ? 'Ledger does not request SMS permission or scan your message history. Message text stays on this device and is not sent to Gemini or a server.'
            : 'Your message text stays on this iPhone. Ledger does not need Gemini or a server to import it.'}
      </Notice>

      <View style={{ gap: 10 }}>
        {steps.map((step, index) => (
          <Card key={step.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              accessibilityLabel={`Step ${index + 1}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.secondary,
              }}
            >
              <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 12 }}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>{step.title}</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 }}>{step.body}</Text>
            </View>
          </Card>
        ))}
      </View>

      <ActionButton
        label={saving ? 'Saving…' : isPreview ? 'Explore Ledger' : 'Got it — open Ledger'}
        icon={isPreview ? 'eye' : 'arrow-right'}
        onPress={finish}
        loading={saving}
      />
      <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        {isPreview
          ? 'Use sample data for this portfolio demo. You can clear local data in Settings.'
          : isAndroid
            ? 'You can revisit these steps in Settings → Message import.'
            : 'You can revisit these instructions any time in Settings → Shortcuts automation.'}
      </Text>
    </Page>
  );
}
