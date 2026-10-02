import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/ThemeContext';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

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
    isLast,
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
    const { colors, textScale, currencySymbol } = useAppTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isAmountFocused, setIsAmountFocused] = useState(false);

    useImperativeHandle(ref, () => ({
        focusDescription: () => {
            if (!isViewMode) {
                descriptionInputRef.current?.focus();
            }
        }
    }));

    const handleDescriptionSubmit = () => {
        amountInputRef.current?.focus();
    };

    const handleAmountSubmit = () => {
        if (isLast) {
            onAdd();
        }
    };

    if (isViewMode) {
        const isFirst = index === 0;
        const isLastItem = index === totalCount - 1;

        return (
            <Animated.View
                entering={FadeIn.duration(300)}
                layout={LinearTransition.duration(200)}
                style={{ paddingVertical: 0, marginBottom: isLastItem ? 16 : 0 }}
            >
                <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingVertical: 8, 
                    paddingHorizontal: 16, 
                    backgroundColor: colors.inputBg,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderTopWidth: isFirst ? 1 : 0,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                    borderTopLeftRadius: isFirst ? 12 : 0,
                    borderTopRightRadius: isFirst ? 12 : 0,
                    borderBottomLeftRadius: isLastItem ? 12 : 0,
                    borderBottomRightRadius: isLastItem ? 12 : 0,
                }}>
                    <Text style={{ flex: 1, color: colors.text, fontSize: 14 * textScale, fontFamily: 'Montserrat', paddingRight: 16 }} numberOfLines={2}>
                        {text || "Без опису"}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 15 * textScale, fontFamily: 'MontserratBold' }}>
                        {num === '0' || num === '' ? '0' : num} {currencySymbol}
                    </Text>
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            layout={LinearTransition.duration(200)}
        >
            <View style={styles.debtItemContainer}>
                <View style={{ flex: 1, marginRight: 8, justifyContent: 'center' }}>
                    <TextInput
                        ref={descriptionInputRef}
                        style={[styles.debtItemTextInput, { marginRight: 0, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, fontSize: 16 * textScale, opacity: isFocused ? 1 : 0 }]}
                        value={text}
                        placeholder="Опис боргу"
                        placeholderTextColor={colors.textSecondary}
                        onChangeText={onTextChange}
                        onSubmitEditing={handleDescriptionSubmit}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        pointerEvents={isFocused ? 'auto' : 'none'}
                        underlineColorAndroid="transparent"
                    />
                    {!isFocused && (
                        <TouchableOpacity 
                            style={[StyleSheet.absoluteFill, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 15 }]} 
                            onPress={() => descriptionInputRef.current?.focus()}
                            activeOpacity={1}
                        >
                            <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: text ? colors.text : colors.textSecondary, fontSize: 16 * textScale, fontFamily: 'Montserrat', includeFontPadding: false, textAlignVertical: 'center' }}>
                                {text || "Опис боргу"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={{ width: 80, marginRight: 8, justifyContent: 'center' }}>
                    <TextInput
                        ref={amountInputRef}
                        style={[styles.debtItemNumberInput, { marginRight: 0, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, fontSize: 16 * textScale, opacity: isAmountFocused ? 1 : 0 }]}
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
                        onFocus={() => setIsAmountFocused(true)}
                        onBlur={() => setIsAmountFocused(false)}
                        pointerEvents={isAmountFocused ? 'auto' : 'none'}
                    />
                    {!isAmountFocused && (
                        <TouchableOpacity 
                            style={[StyleSheet.absoluteFill, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 }]} 
                            onPress={() => amountInputRef.current?.focus()}
                            activeOpacity={1}
                        >
                            <Text numberOfLines={1} style={{ color: (num === '0' || num === '') ? colors.textSecondary : colors.text, fontSize: 16 * textScale, fontFamily: 'Montserrat', includeFontPadding: false, textAlignVertical: 'center' }}>
                                {(num === '0' || num === '') ? "Сума" : num}
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
                            style={[styles.splitButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                        >
                            <MaterialIcons name="more-vert" size={20} color={colors.icon} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={onDelete}
                        style={[styles.deleteButton, { backgroundColor: colors.inputBg, borderColor: colors.border }, isOnly && styles.deleteButtonDisabled]}
                        disabled={isOnly}
                    >
                        <MaterialIcons
                            name="delete"
                            size={20}
                            color={isOnly ? colors.iconSecondary : colors.icon}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    debtItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // Use gap instead of marginRight
    },
    debtItemTextInput: {
        flex: 1,
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 0,
        fontSize: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        fontFamily: 'Montserrat',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    debtItemNumberInput: {
        width: 80,
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 0,
        fontSize: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        textAlign: 'center',
        fontFamily: 'Montserrat',
    },

    splitButton: {
        height: 50,
        width: 50,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButton: {
        height: 50,
        width: 50,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonDisabled: {
        opacity: 0.5,
    },
    addButton: {
        alignSelf: 'center',
        padding: 12,
        backgroundColor: '#E0E0E0',
        marginTop: 4,
        marginBottom: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        width: '100%',
        alignItems: 'center',
    },
});

export default DebtItemComponent;