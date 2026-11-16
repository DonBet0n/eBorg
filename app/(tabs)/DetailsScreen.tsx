import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DebtCard from '../../components/DetailsScreen/DebtCard';
import DebtSheet, { SheetView } from '../../components/DetailsScreen/DebtSheet';
import { groupByDate } from '../../components/DetailsScreen/types';
import Icon from '@/components/ui/Icon';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatAmount, pluralize, PAYMENT_TEXT, PAYMENT_TYPE } from '../../utils/debtCalculations';

interface OpenSheet {
  userId: string;
  view: SheetView;
  fromHistory: boolean;
}

const DetailsScreen = () => {
  const { user, debts, refreshDebts, createDebts, removeDebts, notifyUser } = useFirebase();
  const { colors, isDark, textScale, currencySymbol } = useAppTheme();
  const insets = useSafeAreaInsets();
  const surface = isDark ? colors.card : colors.cardAlt;
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  // Головна передає userId, щоб одразу відкрити історію з потрібною людиною
  const { userId: requestedUserId } = useLocalSearchParams<{ userId?: string }>();

  const people = useMemo(() => (debts || []).map(debt => ({
    ...debt,
    groups: groupByDate(debt.items || [], user?.id),
  })), [debts, user?.id]);

  useEffect(() => {
    if (!requestedUserId || !debts) return;
    if (debts.some(debt => debt.userId === requestedUserId)) {
      setSheet({ userId: requestedUserId, view: 'history', fromHistory: true });
    }
    router.setParams({ userId: undefined });
  }, [requestedUserId, debts]);

  // Дані шторки беруться з живого списку, тож після оплати чи відхилення вона одразу оновлюється
  const active = sheet ? people.find(person => person.userId === sheet.userId) : undefined;
  // Під час згасання шторки показуємо останню людину, щоб вміст не зникав раніше за саму шторку
  const lastActive = useRef(active);
  if (active) lastActive.current = active;
  const shown = active ?? lastActive.current;

  useEffect(() => {
    // Людину прибрали зі списку (відхилено всі записи) — закриваємо шторку
    if (sheet && debts && !active) setSheet(null);
  }, [sheet, debts, active]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDebts();
    setRefreshing(false);
  };

  const openSheet = (userId: string, view: SheetView) =>
    setSheet({ userId, view, fromHistory: view === 'history' });

  const handlePay = async (amount: number) => {
    if (!user || !active) return;
    // Оплата — зустрічний запис, що зменшує борг
    await createDebts([{
      fromUserId: active.totalAmount < 0 ? active.userId : user.id,
      toUserId: active.totalAmount < 0 ? user.id : active.userId,
      amount,
      text: PAYMENT_TEXT,
      type: PAYMENT_TYPE,
    }]);
    notifyUser(active.userId, PAYMENT_TEXT, `${user.name}: повернення ${formatAmount(amount)} ${currencySymbol}`);
  };

  const totalBalance = people.reduce((sum, person) => sum + (person.totalAmount || 0), 0);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text, fontSize: 28 * textScale }]}>Деталі</Text>
      {people.length > 0 && (
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
          {people.length} {pluralize(people.length, 'людина', 'людини', 'людей')} · загалом{' '}
          <Text style={{ color: Math.abs(totalBalance) < 0.005 ? colors.textSecondary : totalBalance > 0 ? colors.positiveText : colors.negativeText }}>
            {totalBalance > 0 ? '+' : ''}{formatAmount(totalBalance)} {currencySymbol}
          </Text>
        </Text>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (!debts) {
      return (
        <View>
          {[0, 1, 2].map(index => (
            <View key={index} style={[styles.skeleton, { backgroundColor: surface }]} />
          ))}
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: surface }]}>
          <Icon name="receipt" size={32} color={colors.iconSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 18 * textScale }]}>Боргів поки немає</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
          Запишіть перший борг або розділіть чек — тут з'явиться історія з кожною людиною.
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.buttonBg }]}
          onPress={() => router.navigate('/(tabs)/AddScreen')}
          accessibilityRole="button"
        >
          <Icon name="add" size={20} color={colors.buttonText} />
          <Text style={[styles.emptyButtonText, { color: colors.buttonText }]}>Додати борг</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={people}
        keyExtractor={item => item.userId}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DebtCard
            userName={item.userName || 'Завантаження...'}
            userAvatar={item.userAvatar}
            groups={item.groups}
            totalAmount={item.totalAmount || 0}
            onPress={() => openSheet(item.userId, 'history')}
            onPayPress={() => openSheet(item.userId, 'pay')}
            onRejectPress={() => openSheet(item.userId, 'select')}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />
        }
      />

      <DebtSheet
        visible={!!active}
        view={sheet?.view ?? 'history'}
        fromHistory={sheet?.fromHistory ?? false}
        userName={shown?.userName || ''}
        userAvatar={shown?.userAvatar}
        groups={shown?.groups ?? []}
        totalAmount={shown?.totalAmount ?? 0}
        onChangeView={view => setSheet(prev => (prev ? { ...prev, view } : prev))}
        onClose={() => setSheet(null)}
        onPay={handlePay}
        onReject={removeDebts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Запас знизу під кнопку «Додати», що виступає над навбаром
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  skeleton: {
    height: 200,
    borderRadius: 20,
    marginBottom: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
});

export default DetailsScreen;
