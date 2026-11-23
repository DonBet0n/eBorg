import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text } from 'react-native';
import Icon from '@/components/ui/Icon';
import { useAppTheme } from '../contexts/ThemeContext';
import { appStyles } from '@/utils/appStyles';

export interface DebtItemComponentProps {
    id: string;
    text: string;
    num: string;
    onTextChange: (text: string) => void;
    onNumChange: (num: string) => void;
    onDelete: () => void;
    isLast: boolean;
    isOnly: boolean;
    onAdd: () => void;
    onSplit?: (x: number, y: number, width: number, height: number) => void;
    isViewMode?: boolean;
    index?: number;
    totalCount?: number;
}

const DebtItemComponent = forwardRef<{ focusDescription: () => void }, DebtItemComponentProps>(({
    text,
    num,
    onTextChange,
    onNumChange,
    onDelete,
    isOnly,
    onAdd,
    onSplit,
    isViewMode,
    index = 0,
    totalCount = 1
}, ref) => {
    const descriptionInputRef = useRef<TextInput>(null);
    const amountInputRef = useRef<TextInput>(null);
    const splitButtonRef = useRef<any>(null);
    const { colors, isDark, textScale, currencySymbol } = useAppTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    // Позиції лежать у картці: у світлій темі вона сіра, тому поля білі
    const fieldColors = { backgroundColor: isDark ? colors.inputBg : colors.background, borderColor: colors.border };
    const isAmountEmpty = num === '0' || num === '';

    useImperativeHandle(ref, () => ({
        focusDescription: () => {
            if (!isViewMode) {
                descriptionInputRef.current?.focus();
            }
        }
    }));

    // Enter в описі переводить курсор у суму цієї ж позиції,
    // а Enter у сумі створює нову позицію і ставить курсор у її опис. Клавіатура весь час лишається відкритою
    const handleDescriptionSubmit = () => {
        amountInputRef.current?.focus();
    };

    const handleAmountSubmit = () => {
        onAdd();
    };

    if (isViewMode) {
        const isFirst = index === 0;
        const isLastItem = index === totalCount - 1;

        return (
            <View>
                <View style={[
                    styles.viewRow,
                    { backgroundColor: fieldColors.backgroundColor, borderTopColor: colors.border },
                    isFirst && styles.viewRowFirst,
                    isLastItem && styles.viewRowLast,
                ]}>
                    <Text style={[styles.viewText, { color: colors.text, fontSize: 14 * textScale }]} numberOfLines={2}>
                        {text || 'Без опису'}
                    </Text>
                    <Text style={[styles.viewAmount, { color: colors.text, fontSize: 16 * textScale }]}>
                        {isAmountEmpty ? '0' : num} {currencySymbol}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View>
            <View style={styles.debtItemContainer}>
                {/* Поле ховається, поки не у фокусі: поверх нього лежить текст, який обрізається трьома крапками */}
                <View style={styles.descriptionField}>
                    <TextInput
                        ref={descriptionInputRef}
                        style={[styles.debtItemTextInput, fieldColors, { color: colors.text, fontSize: 16 * textScale, opacity: isFocused ? 1 : 0 }]}
                        value={text}
                        placeholder="Опис"
                        placeholderTextColor={colors.textSecondary}
                        onChangeText={onTextChange}
                        onSubmitEditing={handleDescriptionSubmit}
                        submitBehavior="submit"
                        returnKeyType="next"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        pointerEvents={isFocused ? 'auto' : 'none'}
                        underlineColorAndroid="transparent"
                        accessibilityLabel="Опис позиції"
                    />
                    {!isFocused && (
                        <TouchableOpacity
                            style={[StyleSheet.absoluteFill, styles.fieldOverlay, styles.descriptionOverlay, fieldColors]}
                            onPress={() => descriptionInputRef.current?.focus()}
                            activeOpacity={1}
                            accessibilityRole="button"
                            accessibilityLabel={text ? `Опис позиції: ${text}` : 'Опис позиції'}
                        >
                            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.fieldOverlayText, { color: text ? colors.text : colors.textSecondary, fontSize: 16 * textScale }]}>
                                {text || 'Опис'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.amountField}>
                    <TextInput
                        ref={amountInputRef}
                        style={[styles.debtItemNumberInput, fieldColors, { color: colors.text, fontSize: 16 * textScale, opacity: isAmountFocused ? 1 : 0 }]}
                        value={num === '0' ? '' : num}
                        keyboardType="decimal-pad"
                        onChangeText={(value) => {
                            let formattedValue = value.replace(',', '.');
                            const [beforeDot, ...afterDot] = formattedValue.split('.');
                            formattedValue = beforeDot.replace(/[^\d]/g, '');
                            if (afterDot.length > 0) {
                                formattedValue += '.' + afterDot.join('').replace(/[^\d]/g, '').slice(0, 2);
                            } else if (value.endsWith('.')) {
                                formattedValue += '.';
                            }
                            onNumChange(formattedValue);
                        }}
                        onSubmitEditing={handleAmountSubmit}
                        submitBehavior="submit"
                        returnKeyType="next"
                        onFocus={() => setIsAmountFocused(true)}
                        onBlur={() => setIsAmountFocused(false)}
                        pointerEvents={isAmountFocused ? 'auto' : 'none'}
                        underlineColorAndroid="transparent"
                        accessibilityLabel="Сума позиції"
                    />
                    {!isAmountFocused && (
                        <TouchableOpacity
                            style={[StyleSheet.absoluteFill, styles.fieldOverlay, styles.amountOverlay, fieldColors]}
                            onPress={() => amountInputRef.current?.focus()}
                            activeOpacity={1}
                            accessibilityRole="button"
                            accessibilityLabel={isAmountEmpty ? 'Сума позиції' : `Сума позиції: ${num} ${currencySymbol}`}
                        >
                            <Text
                                numberOfLines={1}
                                style={[
                                    isAmountEmpty ? styles.fieldOverlayText : styles.amountOverlayText,
                                    { color: isAmountEmpty ? colors.textSecondary : colors.text, fontSize: 16 * textScale },
                                ]}
                            >
                                {isAmountEmpty ? 'Сума' : num}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.actionButtonsContainer}>
                    {onSplit && (
                        <TouchableOpacity
                            ref={splitButtonRef}
                            onPress={() => {
                                splitButtonRef.current?.measure?.((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                                    onSplit(pageX, pageY, width, height);
                                });
                            }}
                            style={styles.iconButton}
                            accessibilityRole="button"
                            accessibilityLabel="Розділити або помножити позицію"
                        >
                            <Icon name="more-vert" size={20} color={colors.icon} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={onDelete}
                        style={[styles.iconButton, isOnly && styles.iconButtonDisabled]}
                        disabled={isOnly}
                        accessibilityRole="button"
                        accessibilityLabel="Видалити позицію"
                        accessibilityState={{ disabled: isOnly }}
                    >
                        <Icon name="delete" size={20} color={colors.iconSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

DebtItemComponent.displayName = 'DebtItemComponent';

const styles = appStyles({
    debtItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    descriptionField: {
        flex: 1,
        marginRight: 8,
        justifyContent: 'center',
    },
    amountField: {
        width: 88,
        justifyContent: 'center',
    },
    debtItemTextInput: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        // Відступи замість порожнечі від центрування: Android (adjustPan) піднімає поле над клавіатурою
        // лише до нижнього краю відступу, тож із paddingVertical: 0 низ поля ховався під нею
        paddingVertical: 12,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    debtItemNumberInput: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 4,
        paddingVertical: 12,
        textAlign: 'center',
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    fieldOverlay: {
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: 'center',
    },
    descriptionOverlay: {
        paddingHorizontal: 12,
    },
    amountOverlay: {
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    fieldOverlayText: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    amountOverlayText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        includeFontPadding: false,
        textAlignVertical: 'center',
        fontVariant: ['tabular-nums'],
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonDisabled: {
        opacity: 0.4,
    },
    // Режим перегляду: рядки зливаються в один список із заокругленими краями
    viewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    viewRowFirst: {
        borderTopWidth: 0,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    viewRowLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    viewText: {
        flex: 1,
        paddingRight: 16,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    viewAmount: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
});

export default DebtItemComponent;
