import React, { useState, useMemo } from 'react';
import { View, FlatList, Modal, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import DebtCard from '../../components/DetailsScreen/DebtCard';
import { useFirebase } from '../../contexts/FirebaseContext';
import detailsStyles from '../../styles/DetailsStyles';
import { DebtGroup, Transaction } from '../../types/debt';
import { MaterialIcons } from '@expo/vector-icons';
import { formatAmount, PAYMENT_TEXT, PAYMENT_TYPE } from '../../utils/debtCalculations';

import { useAppTheme } from '../../contexts/ThemeContext';

interface GroupedTransaction {
    date: Date;
    items: Transaction[];
    totalAmount: number;
    isPayment: boolean;
}

interface SelectedDebt extends Omit<DebtGroup, 'items'> {
    items: GroupedTransaction[];
}

const DetailsScreen = () => {
  const { user, debts, refreshDebts, createDebts, removeDebts, notifyUser } = useFirebase();
  const { colors, detailsBlockSize, textScale, currencySymbol } = useAppTheme();
  const [selectedDebt, setSelectedDebt] = useState<SelectedDebt | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRejectionMode, setIsRejectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});
  const [refreshing, setRefreshing] = useState(false);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDebts();
    setRefreshing(false);
  };

  const groupDebtsByDate = (items: Transaction[]): GroupedTransaction[] => {
    if (!items || items.length === 0) return [];

    const grouped = items.reduce((acc: GroupedTransaction[], item: Transaction) => {
      if (!item) return acc;

      // Якщо це оплата боргу, додаємо як окремий елемент
      if (item.isPayment) {
        acc.push({
          date: item.date,
          items: [item],
          totalAmount: item.amount,
          isPayment: true
        });
        return acc;
      }

      // Групуємо інші транзакції за датою
      const dateKey = new Date(item.date).toLocaleDateString();
      const existingGroup = acc.find((group: GroupedTransaction) => 
        !group.isPayment && 
        new Date(group.date).toLocaleDateString() === dateKey
      );

      const itemAmount = item.fromUserId === user?.id ? -item.amount : item.amount;

      if (existingGroup) {
        existingGroup.items.push(item);
        existingGroup.totalAmount += itemAmount;
      } else {
        acc.push({
          date: item.date,
          items: [item],
          totalAmount: itemAmount,
          isPayment: false
        });
      }
      return acc;
    }, []);

    // Сортуємо за датою (найновіші спочатку)
    return grouped.sort((a: GroupedTransaction, b: GroupedTransaction) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  // Мемоізація групування боргів, щоб воно не викликалося при кожному кліку на розгортання
  const groupedDebts = React.useMemo(() => {
    return (debts || []).map(debt => ({
      ...debt,
      groupedItems: groupDebtsByDate(debt.items || [])
    }));
  }, [debts, user?.id]);

  const handleDebtPress = (debt: any, rejection = false) => {
    setSelectedDebt({
      ...debt,
      items: debt.groupedItems
    });
    setIsRejectionMode(rejection);
    setSelectedItems([]);
    // Розгорнуті групи прив'язані до номера групи, тому для іншої людини скидаємо їх
    setExpandedGroups({});
    setModalVisible(true);
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleRejectItems = async () => {
    try {
      await removeDebts(selectedItems);
      setModalVisible(false);
      setSelectedItems([]);
    } catch (error) {
      console.error('Error rejecting items:', error);
    }
  };

  const handlePayDebt = async (userId: string, amount: number) => {
    try {
      if (!user || !debts) return; // Add null check for debts

      const currentDebt = debts.find(debt => debt.userId === userId);
      if (!currentDebt) return;

      // Створюємо інверсну транзакцію
      // Якщо баланс від'ємний (ми винні), то транзакція буде від нас до користувача
      // Якщо баланс додатній (нам винні), то транзакція буде від користувача до нас
      await createDebts([{
        fromUserId: currentDebt.totalAmount < 0 ? userId : user.id,  // Змінюємо напрямок
        toUserId: currentDebt.totalAmount < 0 ? user.id : userId,    // Змінюємо напрямок
        amount: amount,
        text: PAYMENT_TEXT,
        type: PAYMENT_TYPE,
      }]);

      notifyUser(userId, PAYMENT_TEXT, `${user.name} повернув вам ${amount} грн.`);
    } catch (error) {
      console.error('Error paying debt:', error);
    }
  };

  const allItemIds = useMemo(() => (selectedDebt?.items || []).flatMap((group: GroupedTransaction) =>
    group.items.map((item: Transaction) => item.id)
  ), [selectedDebt]);
  const isAllSelected = allItemIds.length > 0 && selectedItems.length === allItemIds.length;

  const handleSelectAll = () => {
    // Якщо всі елементи вже вибрані - очищаємо вибір
    setSelectedItems(isAllSelected ? [] : allItemIds);
  };

  const blockPadding = detailsBlockSize === 'small' ? 4 : detailsBlockSize === 'large' ? 12 : 8;
  const blockDateSize = (detailsBlockSize === 'small' ? 12 : detailsBlockSize === 'large' ? 16 : 14) * textScale;
  const blockTotalSize = (detailsBlockSize === 'small' ? 16 : detailsBlockSize === 'large' ? 22 : 18) * textScale;
  const blockItemSize = (detailsBlockSize === 'small' ? 14 : detailsBlockSize === 'large' ? 18 : 16) * textScale;

  const renderModalItem = (group: GroupedTransaction, groupIndex: number) => {
    if (group.isPayment) {
      return (
        <View key={`payment-${groupIndex}`} style={detailsStyles.modalItem}>
          <View style={[
            detailsStyles.modalItemRow,
            isRejectionMode && detailsStyles.modalSubItemWithCheckbox
          ]}>
            {isRejectionMode && (
              <TouchableOpacity
                onPress={() => handleItemSelect(group.items[0].id)}
                style={detailsStyles.checkbox}
              >
                <MaterialIcons
                  name={selectedItems.includes(group.items[0].id) ? "check-box" : "check-box-outline-blank"}
                  size={24}
                  color={selectedItems.includes(group.items[0].id) ? colors.positiveText : colors.iconSecondary}
                />
              </TouchableOpacity>
            )}
            <Text style={[detailsStyles.modalItemText, detailsStyles.paymentText, { color: colors.textSecondary }]}>
              {PAYMENT_TEXT}
            </Text>
            <View style={detailsStyles.modalItemInfo}>
              <Text style={[detailsStyles.modalItemAmount, detailsStyles.paymentAmount, { color: colors.text }]}>
                {formatAmount(Math.abs(group.totalAmount))} {currencySymbol}
              </Text>
              <Text style={[detailsStyles.modalItemDate, { color: colors.textSecondary }]}>
                {new Date(group.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Повертаємо групу транзакцій
    return (
      <View key={`group-${groupIndex}`} style={[detailsStyles.modalGroupContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity 
          style={[detailsStyles.modalGroupHeader, { backgroundColor: colors.cardAlt, padding: blockPadding }]}
          onPress={() => toggleGroup(`${groupIndex}`)}
        >
          <View style={detailsStyles.modalGroupLeft}>
            <Text style={[detailsStyles.modalGroupDate, { color: colors.textSecondary, backgroundColor: 'transparent', fontSize: blockDateSize }]}>
              {new Date(group.date).toLocaleDateString()}
            </Text>
            <MaterialIcons 
              name={expandedGroups[`${groupIndex}`] ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color={colors.iconSecondary} 
            />
          </View>
          <Text style={[
            detailsStyles.modalGroupTotal,
            { color: group.totalAmount >= 0 ? colors.positiveText : colors.negativeText, fontSize: blockTotalSize }
          ]}>
            {group.totalAmount > 0 ? '+' : ''}{formatAmount(group.totalAmount)} {currencySymbol}
          </Text>
        </TouchableOpacity>
        {expandedGroups[`${groupIndex}`] && (
          <View style={detailsStyles.modalSubItemsContainer}>
            {group.items.map((item: Transaction, itemIndex: number) => (
              <View key={`${groupIndex}-${itemIndex}`} style={[
                detailsStyles.modalSubItem,
                { borderTopColor: colors.border, padding: blockPadding },
                isRejectionMode && detailsStyles.modalSubItemWithCheckbox
              ]}>
                {isRejectionMode && (
                  <TouchableOpacity
                    onPress={() => handleItemSelect(item.id)}
                    style={detailsStyles.checkbox}
                  >
                    <MaterialIcons
                      name={selectedItems.includes(item.id) ? "check-box" : "check-box-outline-blank"}
                      size={24}
                      color={selectedItems.includes(item.id) ? colors.positiveText : colors.iconSecondary}
                    />
                  </TouchableOpacity>
                )}
                <Text style={[detailsStyles.modalItemText, { color: colors.textSecondary, fontSize: blockItemSize }]} numberOfLines={1}>
                  {item.text}
                </Text>
                <Text style={[
                  detailsStyles.modalItemAmount,
                  { color: item.fromUserId === user?.id ? colors.negativeText : colors.positiveText, fontSize: blockItemSize }
                ]}>
                  {item.fromUserId === user?.id ? '-' : '+'}
                  {formatAmount(Math.abs(item.amount))} {currencySymbol}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[detailsStyles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={groupedDebts}
        keyExtractor={(item) => item.userId}

        renderItem={({ item }) => {
          return (
            <View>
              <DebtCard
                id={item.userId}
                fromUser={item.userName || 'Завантаження...'}
                userAvatar={item.userAvatar}
                items={item.groupedItems} // Передаємо вже згруповані дані
                totalAmount={item.totalAmount || 0}
                onPress={() => handleDebtPress(item)}
                onPayPress={(amount) => handlePayDebt(item.userId, amount)}
                onRejectPress={() => handleDebtPress(item, true)}
              />
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={detailsStyles.modalOverlay}>
          <View style={[detailsStyles.modalContent, { backgroundColor: colors.background }]}>
            <View style={detailsStyles.modalTitleContainer}>
              <Text style={[detailsStyles.modalTitle, { color: colors.text }]}>Баланс</Text>
              {isRejectionMode && (
                <TouchableOpacity
                  style={detailsStyles.selectAllContainer}
                  onPress={handleSelectAll}
                >
                  <MaterialIcons
                    name={isAllSelected ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color={isAllSelected ? colors.positiveText : colors.iconSecondary}
                  />
                  <Text style={[detailsStyles.selectAllText, { color: colors.textSecondary }]}>Вибрати всі</Text>
                </TouchableOpacity>
              )}
              <Text style={[
                detailsStyles.modalTotalAmount,
                { color: (selectedDebt?.totalAmount ?? 0) === 0 ? colors.textSecondary : 
                        (selectedDebt?.totalAmount ?? 0) > 0 ? colors.positiveText : colors.negativeText }
              ]}>
                {(selectedDebt?.totalAmount ?? 0) > 0 ? '+' : ''}
                {formatAmount(selectedDebt?.totalAmount ?? 0)} {currencySymbol}
              </Text>
            </View>
            
            <ScrollView style={detailsStyles.modalScroll}>
              {selectedDebt?.items ? (
                selectedDebt.items.map((group: GroupedTransaction, groupIndex: number) => (
                  renderModalItem(group, groupIndex)
                ))
              ) : (
                <Text style={[detailsStyles.noDataText, { color: colors.textSecondary }]}>Немає транзакцій</Text>
              )}
            </ScrollView>

            <View style={detailsStyles.modalFooter}>
              {isRejectionMode ? (
                <TouchableOpacity 
                  style={[
                    detailsStyles.modalCloseButton,
                    { backgroundColor: colors.buttonBg },
                    selectedItems.length === 0 && detailsStyles.modalButtonDisabled
                  ]}
                  onPress={handleRejectItems}
                  disabled={selectedItems.length === 0}
                >
                  <Text style={[detailsStyles.modalCloseButtonText, { color: colors.buttonText }]}>
                    Відхилити вибрані ({selectedItems.length})
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[detailsStyles.modalCloseButton, { backgroundColor: colors.buttonBg }]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[detailsStyles.modalCloseButtonText, { color: colors.buttonText }]}>Закрити</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DetailsScreen;