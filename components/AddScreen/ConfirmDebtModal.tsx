import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { formatAmount } from '../../utils/debtCalculations';

interface ConfirmDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  debtInfo: {
    fromUser: string;
    toUser: string;
    totalAmount: number;
    itemsCount: number;
  } | null;
  isSuccess?: boolean;
}

const ConfirmDebtModal: React.FC<ConfirmDebtModalProps> = ({
  visible,
  onClose,
  onConfirm,
  debtInfo,
  isSuccess
}) => {
  if (!debtInfo) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {isSuccess ? (
            <>
              <Text style={styles.title}>Борг створено!</Text>
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Борг від <Text style={styles.boldText}>{debtInfo.fromUser}</Text> до{' '}
                  <Text style={styles.boldText}>{debtInfo.toUser}</Text>
                </Text>
                <Text style={styles.amountText}>
                  Сума: {formatAmount(debtInfo.totalAmount)} грн
                </Text>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button]} onPress={onClose}>
                  <Text style={styles.buttonText}>Закрити</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Підтвердження створення боргу</Text>
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Від: <Text style={styles.boldText}>{debtInfo.fromUser}</Text>
                </Text>
                <Text style={styles.infoText}>
                  Кому: <Text style={styles.boldText}>{debtInfo.toUser}</Text>
                </Text>
                <Text style={styles.infoText}>
                  Кількість елементів: {debtInfo.itemsCount}
                </Text>
                <Text style={styles.amountText}>
                  Загальна сума: {formatAmount(debtInfo.totalAmount)} грн
                </Text>
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                  <Text style={styles.buttonText}>Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={onConfirm}>
                  <Text style={styles.buttonText}>Підтвердити</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontFamily: 'MontserratBold',
    marginBottom: 16,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#E53935',
  },
  successButton: {
    backgroundColor: '#4CAF50', // Зелений колір для успішного створення
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'MontserratBold',
  },
  boldText: {
    fontFamily: 'MontserratBold',
  },
});

export default ConfirmDebtModal;
