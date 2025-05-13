import React, { useState } from 'react';
import { View, FlatList, Modal, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import DebtCard from '../../components/DetailsScreen/DebtCard';
import { useAppwrite, APPWRITE } from '../../contexts/AppwriteContext';
import detailsStyles from '../../styles/DetailsStyles';
import { useFocusEffect } from '@react-navigation/native';
import { Debt } from '../../types/debt';
import { ID } from 'react-native-appwrite';
import { MaterialIcons } from '@expo/vector-icons';
import { formatAmount } from '../../utils/debtCalculations';

const DetailsScreen = () => {
  const { getUserDebts, user, databases, debts, refreshDebts } = useAppwrite();
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRejectionMode, setIsRejectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshDebts(); // Тільки перевіряємо необхідність оновлення
    }, [])
  );

  const groupDebtsByDate = (items: any[]) => {
    if (!items || items.length === 0) return [];

    const grouped = items.reduce((acc: any[], item: any) => {
      if (!item) return acc;

      // Якщо це оплата боргу, додаємо як окремий елемент
      if (item.text === 'Оплата боргу') {
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
      const existingGroup = acc.find((group: any) => 
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
    return grouped.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const handleDebtPress = (debt: any, rejection = false) => {
    // Групуємо борги по даті перед встановленням у selectedDebt
    const groupedItems = groupDebtsByDate(debt.items || []);
    setSelectedDebt({
      ...debt,
      items: groupedItems
    });
    setIsRejectionMode(rejection);
    setSelectedItems([]);
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
      // Видаляємо кожен вибраний елемент з бази даних
      const deletePromises = selectedItems.map(itemId =>
        databases.deleteDocument(
          APPWRITE.databases.main,
          APPWRITE.databases.collections.debts,
          itemId
        )
      );

      await Promise.all(deletePromises);
      setModalVisible(false);
      setSelectedItems([]);
      await refreshDebts(); // Використовуємо refreshDebts замість loadDebts
    } catch (error) {
      console.error('Error rejecting items:', error);
      // Тут можна додати відображення помилки користувачу
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
      await databases.createDocument(
        APPWRITE.databases.main,
        APPWRITE.databases.collections.debts,
        'unique()',
        {
          deptId: ID.unique(),
          fromUserId: currentDebt.totalAmount < 0 ? userId : user.id,  // Змінюємо напрямок
          toUserId: currentDebt.totalAmount < 0 ? user.id : userId,    // Змінюємо напрямок
          amount: amount,
          text: 'Оплата боргу',
          createdAt: new Date().toISOString()
        }
      );

      await refreshDebts(); // Використовуємо refreshDebts замість loadDebts
    } catch (error) {
      console.error('Error paying debt:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedDebt) {
      // Якщо всі елементи вже вибрані - очищаємо вибір
      const allItems = selectedDebt.items.flatMap((group: any) => 
        group.isPayment ? [group.items[0].id] : group.items.map((item: any) => item.id)
      );
      
      if (selectedItems.length === allItems.length) {
        setSelectedItems([]);
      } else {
        setSelectedItems(allItems);
      }
    }
  };

  const renderModalItem = (group: any, groupIndex: number) => {
    if (group.isPayment) {
      return (
        <View style={detailsStyles.modalItem}>
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
                  color="#666"
                />
              </TouchableOpacity>
            )}
            <Text style={[detailsStyles.modalItemText, detailsStyles.paymentText]}>
              Оплата боргу
            </Text>
            <View style={detailsStyles.modalItemInfo}>
              <Text style={[detailsStyles.modalItemAmount, detailsStyles.paymentAmount]}>
                {formatAmount(Math.abs(group.totalAmount))} грн
              </Text>
              <Text style={detailsStyles.modalItemDate}>
                {new Date(group.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Повертаємо групу транзакцій
    return (
      <View style={detailsStyles.modalGroupContainer}>
        <TouchableOpacity 
          style={detailsStyles.modalGroupHeader}
          onPress={() => toggleGroup(`${groupIndex}`)}
        >
          <View style={detailsStyles.modalGroupLeft}>
            <Text style={detailsStyles.modalGroupDate}>
              {new Date(group.date).toLocaleDateString()}
            </Text>
            <MaterialIcons 
              name={expandedGroups[`${groupIndex}`] ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color="#666" 
            />
          </View>
          <Text style={[
            detailsStyles.modalGroupTotal,
            { color: group.totalAmount >= 0 ? '#4CAF50' : '#E53935' }
          ]}>
            {group.totalAmount > 0 ? '+' : ''}{formatAmount(group.totalAmount)} грн
          </Text>
        </TouchableOpacity>
        {expandedGroups[`${groupIndex}`] && (
          <View style={detailsStyles.modalSubItemsContainer}>
            {group.items.map((item: any, itemIndex: number) => (
              <View key={`${groupIndex}-${itemIndex}`} style={[
                detailsStyles.modalSubItem,
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
                      color="#666"
                    />
                  </TouchableOpacity>
                )}
                <Text style={detailsStyles.modalItemText} numberOfLines={1}>
                  {item.text}
                </Text>
                <Text style={[
                  detailsStyles.modalItemAmount,
                  { color: item.fromUserId === user?.id ? '#E53935' : '#4CAF50' }
                ]}>
                  {item.fromUserId === user?.id ? '-' : '+'}
                  {Math.abs(item.amount)} грн
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={detailsStyles.container}>
      <FlatList
        data={debts || []}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => {
          // Групуємо транзакції перед передачею в DebtCard
          const groupedItems = groupDebtsByDate(item.items || []);
          return (
            <DebtCard
              id={item.userId}
              fromUser={item.userName || 'Завантаження...'}
              items={groupedItems} // Передаємо вже згруповані дані
              totalAmount={item.totalAmount || 0}
              onPress={() => handleDebtPress(item)}
              onPayPress={(amount) => handlePayDebt(item.userId, amount)}
              onRejectPress={() => handleDebtPress(item, true)}
            />
          );
        }}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={detailsStyles.modalOverlay}>
          <View style={detailsStyles.modalContent}>
            <View style={detailsStyles.modalTitleContainer}>
              <Text style={detailsStyles.modalTitle}>Баланс</Text>
              {isRejectionMode && (
                <TouchableOpacity
                  style={detailsStyles.selectAllContainer}
                  onPress={handleSelectAll}
                >
                  <MaterialIcons
                    name={selectedDebt?.items?.flatMap((group: any) => 
                      group.isPayment ? [group.items[0].id] : group.items.map((item: any) => item.id)
                    ).length === selectedItems.length ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color="#666"
                  />
                  <Text style={detailsStyles.selectAllText}>Вибрати всі</Text>
                </TouchableOpacity>
              )}
              <Text style={[
                detailsStyles.modalSubtitle,
                { color: selectedDebt?.totalAmount === 0 ? '#666' : 
                         selectedDebt?.totalAmount > 0 ? '#4CAF50' : '#E53935' }
              ]}>
                {selectedDebt?.totalAmount > 0 ? '+' : ''}{selectedDebt?.totalAmount ? formatAmount(selectedDebt.totalAmount) : 0} грн
              </Text>
            </View>
            
            <ScrollView style={detailsStyles.modalScroll}>
              {selectedDebt?.items ? (
                selectedDebt.items.map((group: any, groupIndex: number) => (
                  <View key={groupIndex}>
                    {renderModalItem(group, groupIndex)}
                  </View>
                ))
              ) : (
                <Text style={detailsStyles.noDataText}>Немає транзакцій</Text>
              )}
            </ScrollView>

            <View style={detailsStyles.modalFooter}>
              {isRejectionMode ? (
                <TouchableOpacity 
                  style={[
                    detailsStyles.modalCloseButton,
                    selectedItems.length === 0 && detailsStyles.modalButtonDisabled
                  ]}
                  onPress={handleRejectItems}
                  disabled={selectedItems.length === 0}
                >
                  <Text style={detailsStyles.modalCloseButtonText}>
                    Відхилити вибрані ({selectedItems.length})
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={detailsStyles.modalCloseButton} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={detailsStyles.modalCloseButtonText}>Закрити</Text>
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