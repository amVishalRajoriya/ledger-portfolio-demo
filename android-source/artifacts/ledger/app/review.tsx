import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLedger } from '@/context/LedgerContext';
import { formatRupees } from '@/lib/ledger';
import { confirmAction } from '@/lib/confirmAction';
import { ActionButton, Card, EmptyState, IconButton, Notice, Page, PageHeader } from '@/components/LedgerUI';

export default function ReviewScreen() {
  const router = useRouter();
  const colors = useColors();
  const { reviews, resolveReview } = useLedger();

  const discard = (id: string) => {
    confirmAction({
      title: 'Discard this message?',
      message: 'It will be kept locally as ignored and will not affect your totals.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep reviewing',
      destructive: true,
      onConfirm: () => resolveReview(id, true),
    });
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Message review"
        title="Review inbox"
        subtitle={`${reviews.length} ${reviews.length === 1 ? 'message' : 'messages'} need your attention`}
        onBack={() => router.back()}
      />
      <Notice tone="warning" icon="shield">Unclear or near-duplicate messages never become transactions automatically.</Notice>
      {reviews.length === 0 ? (
        <Card>
          <EmptyState title="All caught up" body="Messages that cannot be safely classified will appear here." icon="check-circle" />
        </Card>
      ) : reviews.map((item) => (
        <Card key={item.id} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                {item.parsedAmount !== undefined ? `Possible ${formatRupees(item.parsedAmount)} transaction` : 'Message needs review'}
              </Text>
              <Text style={{ color: colors.warning, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 }}>{item.reason}</Text>
            </View>
            <IconButton name="more-horizontal" label="Discard message" onPress={() => discard(item.id)} color={colors.mutedForeground} />
          </View>
          <View style={{ padding: 12, borderRadius: 13, backgroundColor: colors.secondary, gap: 5 }}>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10 }}>
              {item.sender} · {new Date(item.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
            <Text numberOfLines={5} style={{ color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 }}>{item.body}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <ActionButton
              label="Try again"
              icon="refresh-cw"
              secondary
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/import', params: { body: item.body, sender: item.sender, receivedAt: item.receivedAt, reviewId: item.id } })}
            />
            <ActionButton label="Discard" icon="x" style={{ flex: 1 }} onPress={() => discard(item.id)} />
          </View>
        </Card>
      ))}
    </Page>
  );
}
