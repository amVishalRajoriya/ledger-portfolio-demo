import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Category, Transaction, dayLabel, formatRupees } from '@/lib/ledger';

type ColorSet = ReturnType<typeof useColors>;
const chartTokens = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6', 'chart7', 'chart8'] as const;

export function categoryTint(category: Category | undefined, colors: ColorSet): string {
  return category ? colors[chartTokens[category.tint % chartTokens.length]] : colors.mutedForeground;
}

export function Page({
  children,
  tabbed = false,
  scroll = true,
  style,
}: {
  children: ReactNode;
  tabbed?: boolean;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.pageContent,
    {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 12,
      paddingBottom: Platform.OS === 'web' ? (tabbed ? 100 : 34) : insets.bottom + (tabbed ? 92 : 28),
      backgroundColor: colors.background,
    },
    style,
  ];
  if (!scroll) return <View style={[styles.page, { backgroundColor: colors.background }]}><View style={[contentStyle, { flex: 1 }]}>{children}</View></View>;
  return (
    <ScrollView
      style={[styles.page, { backgroundColor: colors.background }]}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
  onBack,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.headerTitleRow}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Go back" style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{eyebrow.toUpperCase()}</Text> : null}
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function SectionHeading({
  title,
  action,
  onAction,
  subtitle,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeading}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function IconButton({
  name,
  onPress,
  label,
  color,
}: {
  name: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={10} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      <Feather name={name} size={19} color={color ?? colors.foreground} />
    </Pressable>
  );
}

export function ActionButton({
  label,
  icon,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
  style,
  testID,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: secondary ? colors.secondary : colors.primary, borderColor: secondary ? colors.border : colors.primary },
        secondary && { borderWidth: 1 },
        (pressed || disabled) && { opacity: pressed ? 0.78 : 0.5 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.secondaryForeground : colors.primaryForeground} size="small" /> : null}
      {icon && !loading ? <Feather name={icon} size={17} color={secondary ? colors.secondaryForeground : colors.primaryForeground} /> : null}
      <Text style={[styles.actionLabel, { color: secondary ? colors.secondaryForeground : colors.primaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({
  label,
  selected = false,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.pill,
        { backgroundColor: selected ? colors.primary : colors.secondary, borderColor: selected ? colors.primary : colors.border },
        style,
      ]}
    >
      <Text style={[styles.pillLabel, { color: selected ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  hint,
  error,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.textField,
          { color: colors.foreground, backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.input },
          props.multiline && styles.textArea,
          style,
        ]}
      />
      {hint ? <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      {error ? <Text style={[styles.fieldHint, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

export function AmountLabel({ amount, direction, large = false }: { amount: number; direction: 'DEBIT' | 'CREDIT'; large?: boolean }) {
  const colors = useColors();
  return (
    <Text style={[large ? styles.amountLarge : styles.amount, { color: direction === 'CREDIT' ? colors.positive : colors.foreground }]}>
      {direction === 'CREDIT' ? '+' : '−'}{formatRupees(amount)}
    </Text>
  );
}

export function TransactionRow({
  transaction,
  category,
  accountLabel,
  onPress,
}: {
  transaction: Transaction;
  category?: Category;
  accountLabel?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const tint = categoryTint(category, colors);
  const title = transaction.merchantRaw || category?.name || 'Transaction';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.transactionRow, pressed && { opacity: 0.65 }]}
    >
      <View style={[styles.transactionIcon, { backgroundColor: tint + '1A' }]}>
        <Feather name={(category?.icon ?? 'circle') as keyof typeof Feather.glyphMap} size={17} color={tint} />
      </View>
      <View style={styles.transactionMain}>
        <Text numberOfLines={1} style={[styles.transactionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.transactionMeta, { color: colors.mutedForeground }]}>
          {category?.name ?? 'Uncategorised'}{accountLabel ? ` · ${accountLabel}` : ''} · {dayLabel(transaction.occurredAt)}
        </Text>
      </View>
      <View style={styles.transactionAmount}>
        <AmountLabel amount={transaction.amount} direction={transaction.direction} />
        {transaction.linkType ? <Text style={[styles.linkText, { color: colors.mutedForeground }]}>Linked</Text> : null}
      </View>
      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'inbox',
  action,
}: {
  title: string;
  body: string;
  icon?: keyof typeof Feather.glyphMap;
  action?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={23} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{body}</Text>
      {action}
    </View>
  );
}

export function Notice({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'positive';
  icon?: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  const tint = tone === 'warning' ? colors.warning : tone === 'positive' ? colors.positive : colors.primary;
  return (
    <View style={[styles.notice, { backgroundColor: tint + '16', borderColor: tint + '42' }]}>
      {icon ? <Feather name={icon} size={16} color={tint} /> : null}
      <View style={{ flex: 1 }}>{typeof children === 'string'
        ? <Text style={[styles.noticeText, { color: colors.foreground }]}>{children}</Text>
        : children}</View>
    </View>
  );
}

export function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { paddingHorizontal: 20, gap: 18 },
  pageHeader: { marginBottom: 2 },
  headerTitleRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 34, height: 38, justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 5 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7 },
  pageSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 4 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 11 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: -0.15 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 17, gap: 12 },
  actionButton: {
    minHeight: 51, borderRadius: 15, paddingHorizontal: 17, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1,
  },
  actionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  pill: { borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  pillLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  fieldHint: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  textField: {
    minHeight: 49, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14,
    paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top', lineHeight: 21 },
  amount: { fontFamily: 'Inter_600SemiBold', fontSize: 14, letterSpacing: -0.2 },
  amountLarge: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.9 },
  transactionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  transactionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  transactionMain: { flex: 1, gap: 4 },
  transactionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  transactionMeta: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  transactionAmount: { alignItems: 'flex-end', gap: 3 },
  linkText: { fontFamily: 'Inter_500Medium', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6 },
  emptyState: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 31, gap: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 285 },
  notice: { borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1 },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
});

export const sharedStyles = styles;
