import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ProfileModal from '../../components/HomeScreen/ProfileModal';
import { calculateDebts, formatCurrency, formatAmount } from '../../utils/debtCalculations';
import { APPWRITE } from '../../contexts/AppwriteContext';
import { useAppwrite } from '../../contexts/AppwriteContext';
import { Statistics, Debt } from '../../types/debt';

const HomeScreen = () => {
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [debts, setDebts] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    incomingDebts: 0,
    outgoingDebts: 0,
    activeDebtsCount: 0,
    totalBalance: 0
  });
  const { storage, user, getCurrentUser, getUserDebts } = useAppwrite();

  useEffect(() => {
    const init = async () => {
      await getCurrentUser();
      await fetchDebts();
    };
    init();
  }, [user?.id]); // Додаємо залежність від user.id

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchDebts();
      }
    }, [user?.id])
  );

  const fetchDebts = async () => {
    if (!user?.id) return;
    const fetchedDebts = await getUserDebts();
    setDebts(fetchedDebts);
    
    // Розраховуємо статистику на основі всіх боргів
    const allDebts = fetchedDebts.reduce((acc: any[], current: any) => {
      // Перетворюємо кожен борг в правильний формат для calculateDebts
      const debtItems = current.items.map((item: any) => ({
        fromUserId: item.fromUserId,
        toUserId: item.toUserId,
        amount: item.amount
      }));
      return acc.concat(debtItems);
    }, []);
    
    const stats = calculateDebts(allDebts, user.id);
    setStatistics(stats);
  };

  const isPositive = statistics.totalBalance > 0;
  const isZero = statistics.totalBalance === 0;

  return (
    <View style={styles.conteinter}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>eBorg</Text>
        <TouchableOpacity 
          style={styles.headerRight}
          onPress={() => setIsProfileModalVisible(true)}
        >
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || 'Гість'}</Text>
            {user?.avatar ? (
              <Image 
                source={{ 
                  uri: storage.getFileView(
                    APPWRITE.storage.avatars,
                    user.avatar
                  ).href 
                }}
                style={styles.avatarImage}
              />
            ) : (
              <MaterialIcons name="account-circle" size={42} color="black" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Main balance block */}
        <View style={[
          styles.debtCard, 
          isZero ? styles.neutralBackground : isPositive ? styles.positiveBackground : styles.negativeBackground
        ]}>
          <View style={styles.debtCardHeader}>
            <MaterialIcons 
              name={isZero ? "remove-circle" : isPositive ? "arrow-circle-up" : "arrow-circle-down"} 
              size={32} 
              color={isZero ? "#757575" : isPositive ? "#2E7D32" : "#C62828"} 
            />
            <Text style={styles.debtLabel}>Загальний баланс</Text>
          </View>
          <Text style={[styles.debtAmount, 
            isZero ? styles.neutralText : isPositive ? styles.positiveText : styles.negativeText
          ]}>
            {isPositive ? '+' : ''}{formatCurrency(statistics.totalBalance)}
          </Text>
          <Text style={styles.debtDescription}>
            {isZero ? '' : isPositive ? 'Ви в плюсі' : 'Ви в мінусі'}
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statisticsContainer}>
          <Text style={styles.sectionTitle}>Статистика боргів</Text>
          <View style={styles.statisticsGrid}>
            <View style={[styles.statisticItem, styles.incomingDebt]}>
              <Text style={[styles.statisticValue, styles.positiveText]}>
                +{formatAmount(statistics.incomingDebts)} грн
              </Text>
              <Text style={styles.statisticLabel}>Вам винні</Text>
            </View>
            <View style={[styles.statisticItem, styles.outgoingDebt]}>
              <Text style={[styles.statisticValue, styles.negativeText]}>
                -{formatAmount(statistics.outgoingDebts)} грн
              </Text>
              <Text style={styles.statisticLabel}>Ви винні</Text>
            </View>
            <View style={styles.statisticItem}>
              <Text style={styles.statisticValue}>{statistics.activeDebtsCount}</Text>
              <Text style={styles.statisticLabel}>К-сть боргів</Text>
            </View>
          </View>
        </View>

        {/* Recent transactions */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Останні транзакції</Text>
          {debts && debts.length > 0 ? (
            debts.slice(0, 5).flatMap((debtGroup: any) => 
              debtGroup.items.slice(0, 2).map((item: any) => (
                <View key={`${debtGroup.userId}-${item.id}`} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionUser}>{debtGroup.userName}</Text>
                    <Text style={[
                      styles.transactionDescription,
                      item.text === 'Оплата боргу' && styles.paymentText
                    ]}>
                      {item.text}
                    </Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      item.text === 'Оплата боргу' 
                        ? styles.paymentAmount
                        : item.fromUserId === user?.id ? styles.negativeText : styles.positiveText
                    ]}>
                      {item.text === 'Оплата боргу'
                        ? `${Math.abs(item.amount)} грн`
                        : `${item.fromUserId === user?.id ? '-' : '+'}${Math.abs(item.amount)} грн`
                      }
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(item.date || Date.now()).toLocaleDateString('uk-UA')}
                    </Text>
                  </View>
                </View>
              ))
            ).slice(0, 5)
          ) : (
            <Text style={styles.noDataText}>Немає активних боргів</Text>
          )}
        </View>
      </ScrollView>

      <ProfileModal 
        visible={isProfileModalVisible}
        onClose={() => setIsProfileModalVisible(false)}
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
  headerRight: {
    position: 'absolute',
    right: 16,
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
    flexWrap: 'wrap', // Дозволяємо перенос тексту
  },
  statisticLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center', // Центрування тексту
    flexWrap: 'wrap', // Дозволяємо перенос тексту
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
});

export default HomeScreen;