import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import { formatAmount, pluralize, PAYMENT_TEXT } from '../../utils/debtCalculations';
import { useAppTheme } from '../../contexts/ThemeContext';
import { GroupedTransaction } from './types';

interface DebtCardProps {
    userName: string;
    userAvatar?: string;
    groups: GroupedTransaction[];
    totalAmount: number;
    onPress: () => void;
    onPayPress: () => void;
    onRejectPress: () => void;
}

const PREVIEW_COUNT = 2;

export const balanceStatus = (amount: number) =>
    Math.abs(amount) < 0.005 ? 'Розраховано' : amount > 0 ? 'Вам винні' : 'Ви винні';

// Картка людини: баланс, два останні записи і дії. Уся історія — у шторці по натисканню.
const DebtCard: React.FC<DebtCardProps> = ({
    userName, userAvatar, groups, totalAmount, onPress, onPayPress, onRejectPress,
}) => {
    const { colors, isDark, textScale, currencySymbol } = useAppTheme();
    const surface = isDark ? colors.card : colors.cardAlt;
    const field = isDark ? colors.inputBg : colors.background;
    const isSettled = Math.abs(totalAmount) < 0.005;
    const canPay = totalAmount < 0;
    const amountColor = isSettled ? colors.textSecondary : totalAmount > 0 ? colors.positiveText : colors.negativeText;
    const hiddenCount = groups.length - PREVIEW_COUNT;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: surface }]}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${userName}. ${balanceStatus(totalAmount)} ${formatAmount(Math.abs(totalAmount))} ${currencySymbol}. Відкрити історію`}
        >
            <View style={styles.header}>
                <Avatar uri={userAvatar} name={userName} size={44} />
                <View style={styles.headerText}>
                    <Text style={[styles.userName, { color: colors.text, fontSize: 17 * textScale }]} numberOfLines={1}>
                        {userName}
                    </Text>
                    <Text style={[styles.status, { color: colors.textSecondary, fontSize: 13 * textScale }]} numberOfLines={1}>
                        {balanceStatus(totalAmount)}
                    </Text>
                </View>
                <Text style={[styles.totalAmount, { color: amountColor, fontSize: 18 * textScale }]}>
                    {totalAmount > 0 ? '+' : ''}{formatAmount(totalAmount)} {currencySymbol}
                </Text>
            </View>

            {groups.length > 0 && (
                <View style={[styles.preview, { backgroundColor: field }]}>
                    {groups.slice(0, PREVIEW_COUNT).map((group, index) => (
                        <View
                            key={index}
                            style={[styles.previewRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                        >
                            <Text style={[styles.previewDate, { color: colors.textSecondary, fontSize: 13 * textScale }]}>
                                {new Date(group.date).toLocaleDateString()}
                            </Text>
                            <Text style={[styles.previewText, { color: colors.text, fontSize: 14 * textScale }]} numberOfLines={1}>
                                {group.isPayment
                                    ? PAYMENT_TEXT
                                    : `${group.items.length} ${pluralize(group.items.length, 'позиція', 'позиції', 'позицій')}`}
                            </Text>
                            <Text
                                style={[
                                    styles.previewAmount,
                                    { fontSize: 14 * textScale },
                                    { color: group.isPayment ? colors.text : group.totalAmount > 0 ? colors.positiveText : colors.negativeText },
                                ]}
                            >
                                {!group.isPayment && group.totalAmount > 0 ? '+' : ''}
                                {formatAmount(group.isPayment ? Math.abs(group.totalAmount) : group.totalAmount)} {currencySymbol}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.moreRow}>
                <Text style={[styles.moreText, { color: colors.textSecondary, fontSize: 13 * textScale }]}>
                    {hiddenCount > 0
                        ? `Уся історія · ще ${hiddenCount} ${pluralize(hiddenCount, 'запис', 'записи', 'записів')}`
                        : 'Уся історія'}
                </Text>
                <Icon name="chevron-right" size={18} color={colors.iconSecondary} />
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: field }]}
                    onPress={onRejectPress}
                    accessibilityRole="button"
                    accessibilityLabel={`Відхилити записи з ${userName}`}
                >
                    <Text style={[styles.actionText, { color: colors.negativeText, fontSize: 14 * textScale }]}>Відхилити</Text>
                </TouchableOpacity>
                {canPay && (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.buttonBg }]}
                        onPress={onPayPress}
                        accessibilityRole="button"
                        accessibilityLabel={`Сплатити борг ${userName}`}
                    >
                        <Text style={[styles.actionText, { color: colors.buttonText, fontSize: 14 * textScale }]}>Сплатити</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default DebtCard;

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerText: {
        flex: 1,
    },
    userName: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    status: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginTop: 2,
    },
    totalAmount: {
        fontFamily: 'NunitoSansExtraBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    preview: {
        borderRadius: 12,
        marginTop: 12,
        paddingHorizontal: 12,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 40,
    },
    previewDate: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        minWidth: 76,
    },
    previewText: {
        flex: 1,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    previewAmount: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    moreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        marginTop: 8,
    },
    moreText: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
});
