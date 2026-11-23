import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '@/components/ui/Icon';
import { formatAmount } from '../../utils/debtCalculations';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useFormColors } from './FormParts';
import { appStyles } from '@/utils/appStyles';
import { BUTTON } from '@/constants/Theme';

interface ConfirmDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  // Рядки «підпис — значення» і сума боргів, які буде створено; null, поки форма не заповнена
  summary: {
    rows: { label: string; value: string }[];
    amountLabel: string;
    amount: number;
  } | null;
  isSuccess?: boolean;
  // Поки запис іде на сервер, кнопки вимкнені, щоб не створити борг двічі
  isSubmitting?: boolean;
}

const ConfirmDebtModal: React.FC<ConfirmDebtModalProps> = ({
  visible,
  onClose,
  onConfirm,
  summary,
  isSuccess,
  isSubmitting
}) => {
  const { colors, currencySymbol, textScale } = useAppTheme();
  const { surface } = useFormColors();

  if (!summary) return null;

  const amountText = `${formatAmount(summary.amount)} ${currencySymbol}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {isSuccess ? (
            <View style={styles.success}>
              <Icon name="success" size={48} color={colors.positiveText} />
              <Text style={[styles.title, styles.successTitle, { color: colors.text, fontSize: 20 * textScale }]}>Борг створено</Text>
              <Text style={[styles.amount, { color: colors.text, fontSize: 24 * textScale }]}>{amountText}</Text>
              <TouchableOpacity
                style={[styles.button, styles.successButton, { backgroundColor: colors.buttonBg }]}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text style={[styles.buttonText, { color: colors.buttonText, fontSize: 16 * textScale }]}>Закрити</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text, fontSize: 20 * textScale }]}>Створити борг?</Text>

              <View style={[styles.rows, { backgroundColor: surface }]}>
                {summary.rows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                  >
                    <Text style={[styles.rowLabel, { color: colors.textSecondary, fontSize: 14 * textScale }]}>{row.label}</Text>
                    <Text style={[styles.rowValue, { color: colors.text, fontSize: 16 * textScale }]} numberOfLines={2}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.amountRow}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary, fontSize: 16 * textScale }]}>{summary.amountLabel}</Text>
                <Text style={[styles.amount, { color: colors.text, fontSize: 22 * textScale }]}>{amountText}</Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: surface }, isSubmitting && styles.buttonDisabled]}
                  onPress={onClose}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                >
                  <Text style={[styles.buttonText, { color: colors.text, fontSize: 16 * textScale }]}>Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.buttonBg }, isSubmitting && styles.buttonDisabled]}
                  onPress={onConfirm}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!isSubmitting, busy: !!isSubmitting }}
                >
                  <Text style={[styles.buttonText, { color: colors.buttonText, fontSize: 16 * textScale }]}>
                    {isSubmitting ? 'Створення…' : 'Створити'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = appStyles({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  rows: {
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minHeight: 48,
    paddingVertical: 8,
  },
  rowLabel: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  amount: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: BUTTON.height,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BUTTON.radius,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  success: {
    alignItems: 'center',
    paddingTop: 8,
  },
  successTitle: {
    marginTop: 12,
    marginBottom: 4,
  },
  successButton: {
    flex: 0,
    alignSelf: 'stretch',
    marginTop: 20,
  },
});

export default ConfirmDebtModal;
