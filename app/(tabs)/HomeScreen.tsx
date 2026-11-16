import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl } from 'react-native';
import Icon from '@/components/ui/Icon';
import { router } from 'expo-router';
import ProfileModal from '../../components/HomeScreen/ProfileModal';
import SettingsModal from '../../components/SettingsModal';
import { formatAmount, pluralize } from '../../utils/debtCalculations';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Transaction } from '../../types/debt';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Скільки людей видно, поки список згорнутий, і скільки останніх чеків показувати
const COLLAPSED_LIMIT = 10;
const RECEIPTS_LIMIT = 10;
const SKELETON_ROWS = 4;
const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

// Знак відділяємо від числа вузьким нерозривним пробілом
const PLUS = '+ ';
const MINUS = '- ';

// Чек — усі позиції, додані одній людині за один раз
type Receipt = {
  key: string;
  userName: string;
  userAvatar?: string;
  time: number;
  fromMe: boolean;
  isPayment: boolean;
  amount: number;
  texts: string[];
};
type DayGroup = { key: number; label: string; items: Receipt[] };

const toTime = (value: Date) => {
  const time = new Date(value).getTime();
  return isNaN(time) ? 0 : time;
};

const startOfDay = (time: number) => {
  const d = new Date(time);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

// «Сьогодні», «Учора» або «12 вересня»; рік показуємо лише для минулих років
const formatDay = (dayStart: number) => {
  const today = new Date();
  const daysAgo = Math.round((startOfDay(today.getTime()) - dayStart) / 86400000);
  if (daysAgo === 0) return 'Сьогодні';
  if (daysAgo === 1) return 'Учора';
  const date = new Date(dayStart);
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? label : `${label} ${date.getFullYear()}`;
};

const formatClock = (time: number) => {
  const date = new Date(time);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// Розділяє тисячі нерозривним пробілом: 12450.00 → 12 450.00
const groupThousands = (value: string) => {
  const [whole, fraction] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped}.${fraction}` : grouped;
};

// Градієнт зі смужок різної прозорості: не потребує нативного модуля і перезбірки.
// Найнасиченіший під статус-баром і плавно згасає донизу.
const GLOW_STRIPS = 96;
const GLOW_STRIP_HEIGHT = 4;
const GLOW_MAX_OPACITY = 0.4;
const GLOW_OPACITIES = Array.from({ length: GLOW_STRIPS }, (_, index) => {
  const t = index / (GLOW_STRIPS - 1);
  return GLOW_MAX_OPACITY * Math.pow(1 - t, 1.6);
});

const Glow = ({ color }: { color: string }) => (
  <View style={styles.glow} pointerEvents="none">
    {GLOW_OPACITIES.map((opacity, index) => (
      <View key={index} style={{ height: GLOW_STRIP_HEIGHT, backgroundColor: color, opacity }} />
    ))}
  </View>
);

const HomeScreen = () => {
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { user, getCurrentUser, debts, isOnline, statistics, refreshDebts } = useFirebase();
  const { colors, isDark, textScale, showDecimalsBalance, showDecimalsStatistics, currencySymbol } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const [peopleExpanded, setPeopleExpanded] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        await getCurrentUser();
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDebts();
    setRefreshing(false);
  };

  const isLoading = !debts;
  const isZero = Math.abs(statistics.totalBalance) < 0.005;
  const isPositive = !isZero && statistics.totalBalance > 0;
  // На скільки баланс змінився за сьогодні: запис від вас зменшує його, запис вам — збільшує
  const todayChange = useMemo(() => {
    const todayStart = startOfDay(Date.now());
    return (debts ?? [])
      .flatMap(group => group.items)
      .filter(item => toTime(item.date) >= todayStart)
      .reduce((sum, item) => sum + (item.fromUserId === user?.id ? -item.amount : item.amount), 0);
  }, [debts, user?.id]);
  const hasTodayChange = Math.abs(todayChange) >= 0.005;
  // У світлій темі картка зливається з фоном, тому беремо сірішу поверхню
  const surface = isDark ? colors.card : colors.cardAlt;

  const balanceAbs = Math.abs(statistics.totalBalance);
  const balanceText = groupThousands(showDecimalsBalance ? formatAmount(balanceAbs) : Math.trunc(balanceAbs).toString());
  // Знак відділяємо від числа вузьким нерозривним пробілом
  const balanceSign = isZero ? '' : isPositive ? PLUS : MINUS;

  const formatStat = (amount: number) =>
    groupThousands(showDecimalsStatistics ? formatAmount(amount) : Math.trunc(amount).toString());

  // Люди з непогашеним залишком: спершу найбільші суми
  const people = useMemo(() => (debts ?? [])
    .filter(group => Math.abs(group.totalAmount) >= 0.005)
    .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount)), [debts]);
  const visiblePeople = peopleExpanded ? people : people.slice(0, COLLAPSED_LIMIT);

  // Позиції одного чека створюються одним записом і мають спільний час, тому збираємо їх за ним
  const receipts = useMemo<Receipt[]>(() => {
    const byKey = new Map<string, Receipt>();
    (debts ?? []).forEach(group => group.items.forEach((item: Transaction) => {
      const time = toTime(item.date);
      const fromMe = item.fromUserId === user?.id;
      const key = `${group.userId}-${time}-${fromMe ? 'out' : 'in'}-${item.isPayment ? 'pay' : 'debt'}`;
      const receipt = byKey.get(key);
      if (receipt) {
        receipt.amount += item.amount;
        receipt.texts.push(item.text);
      } else {
        byKey.set(key, {
          key,
          userName: group.userName,
          userAvatar: group.userAvatar,
          time,
          fromMe,
          isPayment: item.isPayment,
          amount: item.amount,
          texts: [item.text],
        });
      }
    }));
    return Array.from(byKey.values()).sort((x, y) => y.time - x.time).slice(0, RECEIPTS_LIMIT);
  }, [debts, user?.id]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    receipts.forEach(item => {
      const key = startOfDay(item.time);
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.items.push(item);
      } else {
        groups.push({ key, label: formatDay(key), items: [item] });
      }
    });
    return groups;
  }, [receipts]);

  const isEmpty = !isLoading && receipts.length === 0;
  const openDetails = (userId?: string) =>
    router.navigate({ pathname: '/(tabs)/DetailsScreen', params: userId ? { userId } : {} });

  const renderToggle = (label: string, onPress: () => void) => (
    <TouchableOpacity style={[styles.toggle, { backgroundColor: surface }]} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.toggleText, { color: colors.text, fontSize: 14 * textScale }]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderAvatar = (uri: string | undefined, name: string) => uri ? (
    <Image source={{ uri }} style={styles.rowAvatar} />
  ) : (
    <View style={[styles.rowAvatar, styles.centered, { backgroundColor: colors.border }]}>
      <Text style={[styles.avatarInitial, { color: colors.textSecondary }]}>
        {name ? name.charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
  );

  const renderRow = (item: Receipt) => {
    // Оплата — зворотний запис: якщо вона адресована вам, борг повернули ви
    const subtitle = item.isPayment
      ? (item.fromMe ? 'Повернули вам' : 'Ви повернули')
      : item.texts.length === 1
        ? item.texts[0]
        : `${item.texts.length} ${pluralize(item.texts.length, 'позиція', 'позиції', 'позицій')}: ${item.texts.join(', ')}`;
    // Для оплати плюс — гроші прийшли вам, для боргу плюс — вам винні
    const positive = item.isPayment ? item.fromMe : !item.fromMe;
    return (
      <View key={item.key} style={[styles.row, { backgroundColor: surface }]}>
        {renderAvatar(item.userAvatar, item.userName)}
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.text, fontSize: 16 * textScale }]} numberOfLines={1}>{item.userName}</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary, fontSize: 13 * textScale }]} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowAmount, { color: positive ? colors.positiveText : colors.negativeText, fontSize: 16 * textScale }]}>
            {positive ? PLUS : MINUS}{formatStat(Math.abs(item.amount))} {currencySymbol}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary, fontSize: 13 * textScale }]}>{formatClock(item.time)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />
        }
      >
        {!isLoading && !isZero && <Glow color={isPositive ? '#2E7D32' : '#C62828'} />}

        {/* Шапка прокручується разом із вмістом */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profile}
            onPress={() => setIsProfileModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Відкрити профіль"
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.headerIcon} />
            ) : (
              <View style={[styles.headerIcon, styles.centered, { backgroundColor: surface }]}>
                <Icon name="person" size={24} color={colors.iconSecondary} />
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={[styles.profileGreeting, { color: colors.textSecondary, fontSize: 13 * textScale }]} numberOfLines={1}>
                З поверненням
              </Text>
              <Text style={[styles.profileName, { color: colors.text, fontSize: 18 * textScale }]} numberOfLines={1}>
                Привіт, {user?.name || 'Гість'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIcon, styles.centered, { backgroundColor: surface }]}
            onPress={() => setIsSettingsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Налаштування"
          >
            <Icon name="settings" size={22} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* Баланс */}
        <View style={styles.balance}>
          {isLoading ? (
            <View style={[styles.balanceSkeleton, { backgroundColor: surface }]} />
          ) : (
            <Text
              style={[styles.balanceAmount, { color: colors.text, fontSize: 48 * textScale, lineHeight: 58 * textScale }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {balanceSign}{balanceText}
              <Text style={[styles.balanceCurrency, { fontSize: 24 * textScale }]}> {currencySymbol}</Text>
            </Text>
          )}
          {!isLoading && (hasTodayChange ? (
            <Text style={[styles.balanceToday, { color: todayChange > 0 ? colors.positiveText : colors.negativeText, fontSize: 16 * textScale }]}>
              {todayChange > 0 ? PLUS : MINUS}{formatStat(Math.abs(todayChange))} {currencySymbol} за сьогодні
            </Text>
          ) : (
            <Text style={[styles.balanceLabel, { color: colors.textSecondary, fontSize: 14 * textScale }]}>Сьогодні без змін</Text>
          ))}
          {!isOnline && (
            <Text style={[styles.balanceLabel, { color: colors.textSecondary, fontSize: 13 * textScale }]}>
              Офлайн · дані можуть бути застарілими
            </Text>
          )}
        </View>

        {/* Останні чеки */}
        {isLoading ? (
          Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <View key={index} style={[styles.row, styles.rowSkeleton, { backgroundColor: surface }]} />
          ))
        ) : isEmpty ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 17 * textScale }]}>Записів поки немає</Text>
            <Text style={[styles.rowMeta, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
              Додайте перший борг, і він з&apos;явиться тут.
            </Text>
          </View>
        ) : (
          <>
            {/* Хто винен вам і кому винні ви */}
            {people.length > 0 && (
              <View style={styles.section}>
                <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * textScale }]}>Борги</Text>
                {visiblePeople.map(person => {
                  const owesMe = person.totalAmount > 0;
                  const direction = owesMe ? 'Вам винні' : 'Ви винні';
                  const amount = `${owesMe ? PLUS : MINUS}${formatStat(Math.abs(person.totalAmount))} ${currencySymbol}`;
                  return (
                    <TouchableOpacity
                      key={person.userId}
                      style={[styles.row, { backgroundColor: surface }]}
                      onPress={() => openDetails(person.userId)}
                      accessibilityRole="button"
                      accessibilityLabel={`${person.userName}. ${direction} ${amount}`}
                    >
                      {renderAvatar(person.userAvatar, person.userName)}
                      <View style={styles.rowText}>
                        <Text style={[styles.rowTitle, { color: colors.text, fontSize: 16 * textScale }]} numberOfLines={1}>{person.userName}</Text>
                        <Text style={[styles.rowMeta, { color: colors.textSecondary, fontSize: 13 * textScale }]} numberOfLines={1}>{direction}</Text>
                      </View>
                      <Text style={[styles.personAmount, { color: owesMe ? colors.positiveText : colors.negativeText, fontSize: 16 * textScale }]}>
                        {amount}
                      </Text>
                      <Icon name="chevron-right" size={20} color={colors.iconSecondary} style={styles.personChevron} />
                    </TouchableOpacity>
                  );
                })}
                {people.length > COLLAPSED_LIMIT && renderToggle(
                  peopleExpanded ? 'Згорнути' : `Показати всіх (${people.length})`,
                  () => setPeopleExpanded(expanded => !expanded),
                )}
              </View>
            )}

            {/* Останні чеки */}
            <View style={styles.section}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * textScale }]}>Останні чеки</Text>
              {dayGroups.map((group, index) => (
                <View key={group.key} style={index > 0 && styles.day}>
                  <Text style={[styles.dayLabel, { color: colors.textSecondary, fontSize: 13 * textScale }]}>{group.label}</Text>
                  {group.items.map(renderRow)}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <ProfileModal
        visible={isProfileModalVisible}
        onClose={() => setIsProfileModalVisible(false)}
      />

      <SettingsModal
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 16,
    // Запас під кнопку «Додати», що виступає над навбаром
    paddingBottom: 48,
  },
  // Виходить за бічні відступи списку, щоб тягнутися від краю до краю
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  profileGreeting: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  profileName: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
  },
  balance: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  balanceAmount: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  balanceCurrency: {
    letterSpacing: 0,
  },
  balanceToday: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  balanceLabel: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  balanceSkeleton: {
    width: 220,
    height: 58,
    borderRadius: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginLeft: 4,
    marginBottom: 12,
  },
  personChevron: {
    marginLeft: 4,
    marginRight: -4,
  },
  personAmount: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  toggle: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 8,
  },
  toggleText: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  day: {
    marginTop: 8,
  },
  dayLabel: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginLeft: 4,
    marginBottom: 8,
  },
  // Кожен запис — окрема плитка
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  rowSkeleton: {
    marginTop: 8,
    marginBottom: 0,
  },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 17,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowTitle: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  rowAmount: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  rowMeta: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 32,
  },
  emptyTitle: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
});

export default HomeScreen;
