import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, GestureResponderEvent, Modal, TextInput } from 'react-native';
import { Debt } from '../../types/debt';

interface DebtCardProps {
    id: string;
    fromUser: string;
    items: {
        date: string;
        items: Debt[];
        totalAmount: number;
        isPayment: boolean;
    }[];
    totalAmount: number;
    onPress: () => void;
    onPayPress: (amount: number) => Promise<void>;
    onRejectPress: () => void;
}

const DebtCard: React.FC<DebtCardProps> = ({
    id, fromUser, items, totalAmount, onPress, onPayPress, onRejectPress
}) => {
  const [selectedButton, setSelectedButton] = useState<'pay' | 'reject' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isConfirmMode, setIsConfirmMode] = useState(false);
  const animatedWidth = useRef(new Animated.Value(1)).current;
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const canPay = totalAmount < 0; // Можемо платити тільки якщо ми винні (від'ємний баланс)

  const resetButtons = (callback?: () => void) => {
    setIsConfirmMode(false);
    Animated.spring(animatedWidth, {
      toValue: 1,
      useNativeDriver: false,
      friction: 12, // Збільшили тертя
      tension: 25,  // Зменшили натяг
      restSpeedThreshold: 0.001, // Для більш плавної зупинки
      restDisplacementThreshold: 0.001,
    }).start(() => {
      setSelectedButton(null);
      setIsAnimating(false);
      callback?.();
    });
  };

  const handleContainerPress = (event: GestureResponderEvent) => {
    if (!selectedButton) {
      onPress();
    }
  };

  const handleButtonPress = (type: 'pay' | 'reject', event: GestureResponderEvent) => {
    event.stopPropagation();
    if (isAnimating || (type === 'pay' && !canPay)) return;

    // Якщо натиснута інша кнопка коли одна вже вибрана - скидаємо стан
    if (selectedButton && selectedButton !== type) {
      resetButtons();
      return;
    }

    if (selectedButton === type) {
      if (type === 'pay') {
        setPaymentModalVisible(true);
      } else {
        // Підтвердження дії
        setIsConfirmMode(false);
        Animated.spring(animatedWidth, {
          toValue: 1,
          useNativeDriver: false,
          friction: 12,
          tension: 100,
          restSpeedThreshold: 0.001,
          restDisplacementThreshold: 0.001,
        }).start(() => {
          setIsAnimating(false);
          setSelectedButton(null);
          onRejectPress();
        });
      }
    } else {
      // Перше натискання
      setSelectedButton(type);
      setIsConfirmMode(true);
      Animated.spring(animatedWidth, {
        toValue: 0.7,
        useNativeDriver: false,
        friction: 12,
        tension: 100,
        restSpeedThreshold: 0.001,
        restDisplacementThreshold: 0.001,
      }).start(() => {
        setIsAnimating(false);
      });
    }
  };

  const handlePayConfirm = async () => {
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    await onPayPress(amount);
    setPaymentModalVisible(false);
    setPaymentAmount('');
    resetButtons();
  };

  // Додаємо обробник для скасування
  const handlePaymentCancel = () => {
    setPaymentModalVisible(false);
    setPaymentAmount('');
    resetButtons();
  };

  const handleMaxAmount = () => {
    setPaymentAmount(Math.abs(totalAmount).toString());
  };

  const getButtonContainerStyle = (type: 'pay' | 'reject') => {
    const isSelected = selectedButton === type;

    if (selectedButton === null) {
      return { flex: 1 };
    }

    if (isSelected) {
      return {
        flex: animatedWidth.interpolate({
          inputRange: [0.7, 1],
          outputRange: [2, 1], // 70/30 співвідношення
          extrapolate: 'clamp',
        })
      };
    }

    return {
      flex: animatedWidth.interpolate({
        inputRange: [0.7, 1],
        outputRange: [0.7, 1],
        extrapolate: 'clamp',
      })
    };
  };

  const getButtonStyle = (type: 'pay' | 'reject') => {
    return [
      styles.button,
      type === 'pay' ? styles.payButton : styles.rejectButton,
      // Додаємо стиль для неактивної кнопки
      type === 'pay' && !canPay && styles.disabledButton,
    ];
  };

  const getButtonText = (type: 'pay' | 'reject') => {
    if (selectedButton === type && isConfirmMode) {
      return type === 'pay' ? 'Підтвердити оплату?' : 'Підтвердити відхилення?';
    }
    return type === 'pay' ? 'Сплатити' : 'Відхилити';
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        onPress={handleContainerPress}
        disabled={!!selectedButton || isAnimating}
      >
        <View style={styles.headerRow}>
          <Text style={styles.userName}>{fromUser}</Text>
          <Text style={[
            styles.totalAmount,
            { color: totalAmount === 0 ? '#666' : 
                     totalAmount > 0 ? '#4CAF50' : '#E53935' }
          ]}>
            {totalAmount > 0 ? '+' : ''}{totalAmount} грн
          </Text>
        </View>
        
        <View style={styles.itemsContainer}>
          {items.slice(0, 2).map((group, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemDate}>
                  {new Date(group.date).toLocaleDateString()}
                </Text>
                {group.isPayment ? (
                  <Text style={[styles.itemText, styles.paymentText]}>
                    Оплата боргу
                  </Text>
                ) : (
                  <Text style={styles.itemText}>
                    {group.items.length} {group.items.length === 1 ? 'транзакція' : 'транзакції'}
                  </Text>
                )}
                <Text style={[
                  styles.itemPrice,
                  group.isPayment ? styles.paymentAmount : (
                    group.totalAmount > 0 ? styles.positiveAmount : styles.negativeAmount
                  )
                ]}>
                  {group.isPayment 
                    ? `${Math.abs(group.totalAmount)} грн`
                    : `${group.totalAmount > 0 ? '+' : ''}${group.totalAmount} грн`
                  }
                </Text>
              </View>
            </View>
          ))}
          {items.length > 2 && (
            <Text style={styles.moreItems}>
              ... та ще {items.length - 2} {items.length > 4 ? 'груп' : 'групи'}
            </Text>
          )}
        </View>

        <View style={styles.buttonsContainer}>
          <Animated.View style={[styles.buttonWrapper, getButtonContainerStyle('reject')]}>
            <TouchableOpacity 
              style={getButtonStyle('reject')}
              onPress={(e) => handleButtonPress('reject', e)}
              disabled={isAnimating}
            >
              <Text style={styles.buttonText}>{getButtonText('reject')}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={[styles.buttonWrapper, getButtonContainerStyle('pay')]}>
            <TouchableOpacity 
              style={getButtonStyle('pay')}
              onPress={(e) => handleButtonPress('pay', e)}
              disabled={isAnimating || !canPay}
            >
              <Text style={[
                styles.buttonText,
                !canPay && styles.disabledButtonText
              ]}>
                {getButtonText('pay')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handlePaymentCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Оплата боргу</Text>
            <Text style={styles.modalSubtitle}>
              Загальний борг: {Math.abs(totalAmount)} грн
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Введіть суму"
              />
              <TouchableOpacity
                style={styles.maxButton}
                onPress={handleMaxAmount}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handlePaymentCancel}  // Змінюємо обробник
              >
                <Text style={styles.modalButtonText}>Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handlePayConfirm}
              >
                <Text style={styles.modalButtonText}>Підтвердити</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default DebtCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    //shadowColor: '#000',
    //shadowOffset: { width: 0, height: 2 },
    //shadowOpacity: 0.1,
    //shadowRadius: 4,
    //elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
    marginBottom: 10,
  },
  itemsContainer: {
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  itemText: {
    fontSize: 16, // Збільшено з 14
    fontFamily: 'Montserrat',
    color: '#666',
  },
  itemPrice: {
    fontSize: 16, // Збільшено з 14
    fontFamily: 'Montserrat',
    color: '#666',
  },
  moreItems: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    height: 40,
  },
  buttonWrapper: {
    marginHorizontal: 4,
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButton: {
    backgroundColor: '#4CAF50', // Зелений колір
  },
  rejectButton: {
    backgroundColor: '#E53935',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'MontserratBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    fontSize: 16,
  },
  maxButton: {
    backgroundColor: '#666666', // Змінюємо також колір кнопки MAX
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  maxButtonText: {
    color: 'white',
    fontFamily: 'MontserratBold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E53935',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontFamily: 'MontserratBold',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  disabledButtonText: {
    color: '#666666',
  },
  paymentText: {
    fontFamily: 'MontserratBold',
    color: '#666',
  },
  paymentAmount: {
    fontFamily: 'Montserrat',
    color: '#666666',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  itemDate: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    minWidth: 80,
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#E53935',
  },
});
