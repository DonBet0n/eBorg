import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, GestureResponderEvent, Modal, TextInput, Image } from 'react-native';
import { Transaction } from '../../types/debt';
import { formatAmount, pluralize, PAYMENT_TEXT } from '../../utils/debtCalculations';
import { useAppTheme } from '../../contexts/ThemeContext';

interface DebtCardProps {
    id: string;
    fromUser: string;
    userAvatar?: string;
    items: {
        date: Date;
        items: Transaction[];
        totalAmount: number;
        isPayment: boolean;
    }[];
    totalAmount: number;
    onPress: () => void;
    onPayPress: (amount: number) => Promise<void>;
    onRejectPress: () => void;
}

const DebtCard: React.FC<DebtCardProps> = ({
    id, fromUser, userAvatar, items = [], totalAmount, onPress, onPayPress, onRejectPress
}) => {
  const [selectedButton, setSelectedButton] = useState<'pay' | 'reject' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isConfirmMode, setIsConfirmMode] = useState(false);
  const animatedWidth = useRef(new Animated.Value(1)).current;
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const { colors, textScale, currencySymbol } = useAppTheme();
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
    setPaymentAmount(Number(Math.abs(totalAmount).toFixed(2)).toString());
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
        style={[styles.container, { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }]} 
        onPress={handleContainerPress}
        disabled={!!selectedButton || isAnimating}
      >
        <View style={styles.headerRow}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{fromUser.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={[styles.userName, { color: colors.text, fontSize: 18 * textScale }]} numberOfLines={1}>{fromUser}</Text>
          </View>
          <Text style={[
            styles.totalAmount,
            { color: totalAmount === 0 ? colors.textSecondary : 
                     totalAmount > 0 ? colors.positiveText : colors.negativeText,
              fontSize: 18 * textScale }
          ]}>
            {totalAmount > 0 ? '+' : ''}{formatAmount(totalAmount || 0)} {currencySymbol}
          </Text>
        </View>
        
        <View style={styles.itemsContainer}>
          {(items || []).slice(0, 2).map((group, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemDate, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
                  {new Date(group.date).toLocaleDateString()}
                </Text>
                {group.isPayment ? (
                  <Text style={[styles.itemText, styles.paymentText, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
                    {PAYMENT_TEXT}
                  </Text>
                ) : (
                  <Text style={[styles.itemText, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
                    {(group.items || []).length} {pluralize((group.items || []).length, 'транзакція', 'транзакції', 'транзакцій')}
                  </Text>
                )}
                <Text style={[
                  styles.itemPrice,
                  { fontSize: 14 * textScale },
                  group.isPayment ? [styles.paymentAmount, { color: colors.text }] : (
                    group.totalAmount > 0 ? { color: colors.positiveText } : { color: colors.negativeText }
                  )
                ]}>
                  {group.isPayment 
                    ? `${formatAmount(group.totalAmount || 0)} ${currencySymbol}`
                    : `${group.totalAmount > 0 ? '+' : ''}${formatAmount(group.totalAmount || 0)} ${currencySymbol}`
                  }
                </Text>
              </View>
            </View>
          ))}
          {(items || []).length > 2 && (
            <Text style={[styles.moreItems, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
              ... та ще {items.length - 2} {pluralize(items.length - 2, 'група', 'групи', 'груп')}
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
              <Text style={[styles.buttonText, { fontSize: 14 * textScale }]}>{getButtonText('reject')}</Text>
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
                { fontSize: 14 * textScale },
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
        statusBarTranslucent={true}
        onRequestClose={handlePaymentCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * textScale }]}>{PAYMENT_TEXT}</Text>
            
            {/* Натискання підставляє всю суму боргу в поле */}
            <TouchableOpacity style={styles.amountInfoContainer} onPress={handleMaxAmount} activeOpacity={0.6}>
              <Text style={[styles.amountInfoLabel, { color: colors.textSecondary, fontSize: 14 * textScale }]}>До сплати:</Text>
              <Text style={[styles.amountInfoValue, { color: colors.text, fontSize: 18 * textScale }]}>
                {formatAmount(Math.abs(totalAmount))} {currencySymbol}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.paymentInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, fontSize: 24 * textScale }]}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={(text) => {
                  // На українській клавіатурі десятковий роздільник — кома, тому приводимо її до крапки
                  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                  const [whole, ...fraction] = cleaned.split('.');
                  if (fraction.length > 1) return;
                  setPaymentAmount(fraction.length ? `${whole}.${fraction[0].slice(0, 2)}` : whole);
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <Text style={[styles.currencyLabel, { color: colors.textSecondary, fontSize: 24 * textScale }]}>{currencySymbol}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={handlePaymentCancel}
              >
                <Text style={[styles.modalButtonText, { color: colors.text, fontSize: 16 * textScale }]}>Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.buttonBg }]}
                onPress={handlePayConfirm}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText, fontSize: 16 * textScale }]}>Підтвердити</Text>
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
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
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
    fontSize: 16,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
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
    backgroundColor: '#4CAF50',
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
    alignItems: 'center',
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
  paymentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    textAlign: 'center',
  },
  currencyLabel: {
    fontFamily: 'Montserrat',
  },
  amountInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  amountInfoLabel: {
    fontFamily: 'Montserrat',
  },
  amountInfoValue: {
    fontFamily: 'MontserratBold',
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
