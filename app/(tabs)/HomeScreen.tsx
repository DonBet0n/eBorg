import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ProfileModal from '../../components/HomeScreen/ProfileModal';
import SettingsModal from '../../components/SettingsModal';
import { formatCurrency, formatAmount } from '../../utils/debtCalculations';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';

const HomeScreen = () => {
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { user, getCurrentUser, debts, isOnline, statistics, refreshDebts } = useFirebase();
  const { colors, textScale, showDecimalsBalance, showDecimalsStatistics, wrapStatisticsText, currencySymbol } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

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

  const isPositive = statistics.totalBalance > 0;
  const isZero = statistics.totalBalance === 0;

  const formatBalance = (amount: number) => {
    if (!showDecimalsBalance) return Math.trunc(amount).toString();
    return formatCurrency(amount);
  };

  const formatStat = (amount: number) => {
    if (!showDecimalsStatistics) return Math.trunc(amount).toString();
    return formatAmount(amount);
  };

  return (
    <View style={[styles.conteinter, { backgroundColor: colors.background }]}>
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>
            Офлайн режим - дані можуть бути не актуальними
          </Text>
        </View>
      )}
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.headerLeft}
          onPress={() => setIsSettingsVisible(true)}
        >
          <MaterialIcons name="settings" size={28} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>eBorg</Text>
        <TouchableOpacity 
          style={styles.headerRight}
          onPress={() => setIsProfileModalVisible(true)}
        >
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Гість'}</Text>
            {user?.avatar ? (
              <Image 
                source={{ uri: user.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <MaterialIcons name="account-circle" size={42} color={colors.icon} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Main balance block */}
        <View style={[
          styles.debtCard, 
          { backgroundColor: isZero ? colors.neutralBg : isPositive ? colors.positiveBg : colors.negativeBg, elevation: 0, shadowOpacity: 0 }
        ]}>
          <View style={styles.debtCardHeader}>
            <MaterialIcons 
              name={isZero ? "remove-circle" : isPositive ? "arrow-circle-up" : "arrow-circle-down"} 
              size={32} 
              color={isZero ? colors.neutralText : isPositive ? colors.positiveText : colors.negativeText} 
            />
            <Text style={[styles.debtLabel, { color: colors.textSecondary, fontSize: 16 * textScale }]}>Загальний баланс</Text>
          </View>
          <Text style={[styles.debtAmount, 
            { color: isZero ? colors.neutralText : isPositive ? colors.positiveText : colors.negativeText, fontSize: 36 * textScale }
          ]}>
            {isPositive ? '+' : ''}{formatBalance(statistics.totalBalance)}
          </Text>
          <Text style={[styles.debtDescription, { color: colors.textSecondary, fontSize: 16 * textScale }]}>
            {isZero ? '' : isPositive ? 'Ви в плюсі' : 'Ви в мінусі'}
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statisticsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 20 * textScale }]}>Статистика боргів</Text>
          <View style={[styles.statisticsGrid, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <View style={[styles.statisticItem, { backgroundColor: colors.positiveBg }]}>
              <Text style={[styles.statisticValue, { color: colors.positiveText, fontSize: 18 * textScale }]} adjustsFontSizeToFit minimumFontScale={wrapStatisticsText ? 0.5 : undefined} numberOfLines={wrapStatisticsText ? 2 : 1}>
                +{formatStat(statistics.incomingDebts)}{wrapStatisticsText ? '\n' : '\u00A0'}{currencySymbol}
              </Text>
              <Text style={[styles.statisticLabel, { color: colors.textSecondary, fontSize: 14 * textScale }]}>Вам винні</Text>
            </View>
            <View style={[styles.statisticItem, { backgroundColor: colors.negativeBg }]}>
              <Text style={[styles.statisticValue, { color: colors.negativeText, fontSize: 18 * textScale }]} adjustsFontSizeToFit minimumFontScale={wrapStatisticsText ? 0.5 : undefined} numberOfLines={wrapStatisticsText ? 2 : 1}>
                -{formatStat(statistics.outgoingDebts)}{wrapStatisticsText ? '\n' : '\u00A0'}{currencySymbol}
              </Text>
              <Text style={[styles.statisticLabel, { color: colors.textSecondary, fontSize: 14 * textScale }]}>Ви винні</Text>
            </View>
            <View style={styles.statisticItem}>
              <Text style={[styles.statisticValue, { color: colors.text, fontSize: 18 * textScale }]} numberOfLines={1} adjustsFontSizeToFit>{statistics.activeDebtsCount}</Text>
              <Text style={[styles.statisticLabel, { color: colors.textSecondary, fontSize: 14 * textScale }]}>К-сть боргів</Text>
            </View>
          </View>
        </View>

        {/* Recent transactions */}
        <View style={styles.transactionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 20 * textScale }]}>Останні транзакції</Text>
          {(() => {
            if (!debts) return null;
            const allTransactions = debts.flatMap(debt => 
              debt.items.map(item => ({
                ...item,
                userId: debt.userId,
                userName: debt.userName,
                userAvatar: debt.userAvatar,
              }))
            ).sort((a: any, b: any) => {
              const timeA = a.date ? new Date(a.date).getTime() : 0;
              const timeB = b.date ? new Date(b.date).getTime() : 0;
              return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });
            const recentTransactions = allTransactions.slice(0, 5);

            if (recentTransactions.length === 0) {
              return <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Немає активних боргів</Text>;
            }

            return recentTransactions.map((item: any) => (
                <Animated.View 
                  key={`${item.userId}-${item.id}`} 
                  entering={FadeInUp}
                  layout={LinearTransition.springify()}
                  style={[styles.transactionItem, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                >
                  <View style={[styles.transactionLeft, { flexDirection: 'row', alignItems: 'center' }]}>
                    {item.userAvatar ? (
                      <Image source={{ uri: item.userAvatar }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Text style={{ fontSize: 18, color: colors.textSecondary, fontFamily: 'MontserratBold' }}>
                          {item.userName ? item.userName.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.transactionUser, { color: colors.text, fontSize: 16 * textScale }]}>{item.userName}</Text>
                      <Text style={[
                        styles.transactionDescription,
                        { color: colors.textSecondary, fontSize: 14 * textScale },
                        item.isPayment && { color: colors.textSecondary }
                      ]}>
                        {item.text}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      item.isPayment 
                        ? { color: colors.textSecondary, fontSize: 16 * textScale }
                        : { color: item.fromUserId === user?.id ? colors.negativeText : colors.positiveText, fontSize: 16 * textScale }
                    ]}>
                      {item.isPayment
                        ? `${Math.abs(item.amount)} ${currencySymbol}`
                        : `${item.fromUserId === user?.id ? '-' : '+'}${Math.abs(item.amount)} ${currencySymbol}`
                      }
                    </Text>
                    <Text style={[styles.transactionDate, { color: colors.textSecondary, fontSize: 12 * textScale }]}>
                      {new Date(item.date || Date.now()).toLocaleDateString('uk-UA')}
                    </Text>
                  </View>
                </Animated.View>
            ));
          })()}
        </View>
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
  conteinter: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: 'MontserratBold',
    color: '#000',
    position: 'absolute',
    alignSelf: 'center',
  },
  headerLeft: {
    position: 'absolute',
    left: 16,
    justifyContent: 'center',
  },
  headerRight: {
    position: 'absolute',
    right: 16,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  debtCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  debtCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center', // Додано для центрування по горизонталі
  },
  positiveBackground: {
    backgroundColor: '#E8F5E9', // світло-зелений
  },
  negativeBackground: {
    backgroundColor: '#FFEBEE', // світло-червоний
  },
  neutralBackground: {
    backgroundColor: '#F5F5F5', // нейтральний сірий
  },
  debtLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8, // Додано відступ від іконки
    fontFamily: 'Montserrat',
  },
  debtAmount: {
    fontSize: 32,
    fontFamily: 'MontserratBold',
    marginBottom: 8,
  },
  positiveText: {
    color: '#2E7D32', // зелений
  },
  negativeText: {
    color: '#C62828', // червоний
  },
  neutralText: {
    color: '#000000', // чорний
  },
  debtDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  statisticsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
    marginBottom: 12,
  },
  statisticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statisticItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4, // Додано горизонтальний падінг
    marginHorizontal: 2,
    borderRadius: 8,
    minHeight: 70, // Фіксована мінімальна висота
  },
  incomingDebt: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)', // світло-зелений фон
  },
  outgoingDebt: {
    backgroundColor: 'rgba(198, 40, 40, 0.1)', // світло-червоний фон
  },
  statisticValue: {
    fontSize: 14, // Зменшено розмір шрифту
    fontFamily: 'MontserratBold',
    marginBottom: 4,
    textAlign: 'center', // Центрування тексту
  },
  statisticLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center', // Центрування тексту
  },
  transactionsContainer: {
    marginBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionUser: {
    fontSize: 16,
    fontFamily: 'MontserratBold',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'MontserratBold',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    marginRight: 8,
    fontFamily: 'Montserrat',
    fontSize: 14,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    marginTop: 16,
  },
  paymentText: {
    fontFamily: 'MontserratBold',
    color: '#666',
  },
  paymentAmount: {
    color: '#666666',
  },
  offlineBar: {
    backgroundColor: '#FFA000',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontFamily: 'Montserrat',
    fontSize: 12,
  },
});

export default HomeScreen;