import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActionButton, Card, Notice, Page, PageHeader } from '@/components/LedgerUI';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { useAndroidNotificationAccess } from '@/hooks/useAndroidNotificationAccess';
import { confirmAction } from '@/lib/confirmAction';

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
    title: 'Choose whether to enable automatic alerts',
    body: 'You can grant Android notification access so Ledger can identify bank-like alerts. This permission can expose notification contents, so it is optional and stays off until you enable it.',
  },
  {
    title: 'Ledger filters on this device',
    body: 'Only likely bank and payment alerts are queued. Ledger parses them locally; recognized alerts enter your ledger and uncertain bank messages go to Review.',
  },
  {
    title: 'Duplicates and other notifications stay safe',
    body: 'Repeated alerts are checked against imports already on this device. Promotions, OTPs, and unrelated notifications are not imported as transactions.',
  },
  {
    title: 'Keep manual import available',
    body: 'You can still copy and paste a bank alert when automatic import is off. Ledger never asks for SMS inbox access or sends messages to Gemini or a server.',
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
    body: 'This preview stores data in the browser or Expo Go on this device. Native notification access and iOS file protection are unavailable here. Do not enter real financial messages.',
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const { completeOnboarding } = useLedger();
  const [saving, setSaving] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const notificationAccess = useAndroidNotificationAccess();
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

  const enableAndroidNotifications = async () => {
    setNotificationError('');
    try {
      await notificationAccess.enable();
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Could not open Android notification settings.');
    }
  };

  const disableAndroidNotifications = () => {
    confirmAction({
      title: 'Turn off automatic bank alerts?',
      message: 'Ledger will stop capturing alerts and clear any bank alerts waiting in its local queue.',
      confirmLabel: 'Turn off',
      destructive: true,
      onConfirm: () => {
        void notificationAccess.disable().catch(() => {
          setNotificationError('Automatic import could not be turned off. Try again.');
        });
      },
    });
  };

  const openAndroidNotificationSettings = async () => {
    setNotificationError('');
    try {
      await notificationAccess.openSystemSettings();
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Could not open Android notification settings.');
    }
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
              ? 'Optional Android notification access can import new bank alerts. Copy and paste remains available, and Ledger never reads your SMS inbox.'
              : 'One-time setup forwards new alerts through Apple Shortcuts. Ledger processes them on this iPhone.'
        }
      />

      <Notice tone={isPreview ? 'warning' : 'positive'} icon={isPreview ? 'smartphone' : 'lock'}>
        {isPreview
          ? isAndroid
            ? 'Android notification access is unavailable in this web or Expo Go preview. Use only fictional data here.'
            : 'The native Messages Shortcut and iOS file protection are not active in this web or Expo Go preview.'
          : isAndroid
            ? 'Ledger does not request SMS permission or scan your message history. Message text stays on this device and is not sent to Gemini or a server.'
            : 'Your message text stays on this iPhone. Ledger does not need Gemini or a server to import it.'}
      </Notice>

      {isAndroid ? (
        <Card style={{ gap: 11 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Optional automatic bank alerts</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19 }}>
            Android notification access allows Ledger to inspect notification contents. It filters likely bank alerts on-device and never reads SMS history. No notification text is sent to Gemini or a server. You can revoke access later in Android settings.
          </Text>
          {!notificationAccess.status.available ? (
            <Notice tone="warning" icon="smartphone">
              Automatic notification import requires an installed Android build. Use copy and paste in this preview.
            </Notice>
          ) : notificationAccess.status.enabled && notificationAccess.status.accessGranted ? (
            <Notice tone="positive" icon="check-circle">Automatic bank alert import is on.</Notice>
          ) : notificationAccess.status.enabled ? (
            <Notice tone="warning" icon="bell">Automatic import is paused until Android notification access is granted.</Notice>
          ) : (
            <Notice tone="neutral" icon="bell">Automatic bank alert import is off until you choose to enable it.</Notice>
          )}
          {notificationError ? <Notice tone="warning" icon="alert-triangle">{notificationError}</Notice> : null}
          <ActionButton
            label={!notificationAccess.status.available
              ? 'Requires an installed Android build'
              : notificationAccess.status.enabled
                ? 'Turn off automatic import'
                : 'Enable automatic import'}
            icon={notificationAccess.status.enabled ? 'bell-off' : 'bell'}
            disabled={!notificationAccess.status.available}
            testID="onboarding-android-auto-import-toggle"
            onPress={notificationAccess.status.enabled ? disableAndroidNotifications : enableAndroidNotifications}
          />
          {notificationAccess.status.available && notificationAccess.status.enabled && !notificationAccess.status.accessGranted ? (
            <ActionButton
              label="Grant notification access"
              icon="bell"
              secondary
              testID="onboarding-android-notification-access-grant"
              onPress={enableAndroidNotifications}
            />
          ) : null}
          {notificationAccess.status.available && notificationAccess.status.accessGranted ? (
            <ActionButton
              label="Manage Android notification access"
              icon="settings"
              secondary
              testID="onboarding-android-notification-access-manage"
              onPress={openAndroidNotificationSettings}
            />
          ) : null}
        </Card>
      ) : null}

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
