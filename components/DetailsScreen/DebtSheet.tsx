import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import BottomSheet from '@/components/ui/BottomSheet';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import { Transaction } from '../../types/debt';
import { formatAmount, pluralize, PAYMENT_TEXT } from '../../utils/debtCalculations';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useFirebase } from '../../contexts/FirebaseContext';
import { GroupedTransaction } from './types';
import { balanceStatus } from './DebtCard';

export type SheetView = 'history' | 'select' | 'pay';

interface DebtSheetProps {
    visible: boolean;
    view: SheetView;
    // Звідки відкрито «Відхилити»/«Сплатити»: з історії — повертаємось туди, з картки — закриваємо шторку
    fromHistory: boolean;
    userName: string;
    userAvatar?: string;
    groups: GroupedTransaction[];
    totalAmount: number;
    onChangeView: (view: SheetView) => void;
    onClose: () => void;
    onPay: (amount: number) => Promise<void>;
    onReject: (ids: string[]) => Promise<void>;
}

const groupKey = (group: GroupedTransaction) => group.items[0]?.id ?? String(group.date);

const CHECKBOX_SIZE = 22;
const THREAD_WIDTH = 2;
// Маркер однаковий в обох темах, тому текст на ньому завжди темний
const HIGHLIGHT_BG = '#FFE066';

const DebtSheet: React.FC<DebtSheetProps> = ({
    visible, view, fromHistory, userName, userAvatar, groups, totalAmount, onChangeView, onClose, onPay, onReject,
}) => {
    const { user } = useFirebase();
    const { colors, isDark, textScale, currencySymbol, detailsBlockSize } = useAppTheme();
    const surface = isDark ? colors.card : colors.cardAlt;
    // colors.border майже зливається з сірою карткою, тому гілка трохи темніша
    const threadColor = isDark ? '#4A4A4A' : '#C8C8C8';

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    // У знайдених чеках показувати всі позиції, а не лише ті, що збіглися з пошуком
    const [showWholeReceipt, setShowWholeReceipt] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isBusy, setIsBusy] = useState(false);

    // Нова людина або нове відкриття — чистий стан
    useEffect(() => {
        if (!visible) return;
        setExpanded({});
        setSearchQuery('');
        setShowWholeReceipt(false);
    }, [visible, userName]);

    useEffect(() => {
        setSelected([]);
        setPaymentAmount('');
    }, [view, visible]);

    const isSelecting = view === 'select';
    const debtAbs = Math.abs(totalAmount);
    const isSettled = debtAbs < 0.005;
    const canPay = totalAmount < 0;
    const amountColor = isSettled ? colors.textSecondary : totalAmount > 0 ? colors.positiveText : colors.negativeText;

    const padding = detailsBlockSize === 'small' ? 8 : detailsBlockSize === 'large' ? 16 : 12;
    const itemSize = (detailsBlockSize === 'small' ? 14 : detailsBlockSize === 'large' ? 18 : 16) * textScale;

    // ---------- Пошук ----------
    const query = searchQuery.trim().toLowerCase();
    const isSearching = query.length > 0;
    const isMatch = (item: Transaction) => (item.text || '').toLowerCase().includes(query);

    // Кожен збіг із пошуком — жовтим маркером, як у браузері
    const highlightMatches = (text: string) => {
        const lower = text.toLowerCase();
        const parts: React.ReactNode[] = [];
        let from = 0;
        let at = lower.indexOf(query);
        while (at !== -1) {
            if (at > from) parts.push(text.slice(from, at));
            parts.push(
                <Text key={at} style={[styles.highlight, { backgroundColor: HIGHLIGHT_BG }]}>
                    {text.slice(at, at + query.length)}
                </Text>,
            );
            from = at + query.length;
            at = lower.indexOf(query, from);
        }
        if (from < text.length) parts.push(text.slice(from));
        return parts;
    };
    const visibleGroups = useMemo(() => groups
        .map(group => ({
            group,
            matches: isSearching ? group.items.filter(item => !group.isPayment && isMatch(item)) : group.items,
        }))
        .filter(entry => !isSearching || entry.matches.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, query]);
    const hasReceipts = groups.some(group => !group.isPayment);

    // ---------- Вибір записів ----------
    const allIds = useMemo(() => groups.flatMap(group => group.items.map(item => item.id)), [groups]);
    const isAllSelected = allIds.length > 0 && selected.length === allIds.length;

    const toggleItem = (id: string) =>
        setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const toggleGroup = (group: GroupedTransaction) => {
        const ids = group.items.map(item => item.id);
        const allIn = ids.every(id => selected.includes(id));
        setSelected(prev => (allIn ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
    };

    const confirmReject = () => {
        const count = selected.length;
        Alert.alert(
            `Відхилити ${count} ${pluralize(count, 'запис', 'записи', 'записів')}?`,
            `Їх буде видалено у вас і в ${userName}. Цю дію не можна скасувати.`,
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Відхилити',
                    style: 'destructive',
                    onPress: async () => {
                        setIsBusy(true);
                        try {
                            await onReject(selected);
                            // Якщо відхилено все, людина зникне зі списку — нема що показувати
                            if (isAllSelected) onClose();
                            else onChangeView('history');
                        } catch {
                            Alert.alert('Помилка', 'Не вдалося відхилити записи. Спробуйте ще раз.');
                        } finally {
                            setIsBusy(false);
                        }
                    },
                },
            ],
        );
    };

    // ---------- Оплата ----------
    const amount = Number(paymentAmount);
    const hasAmount = paymentAmount.length > 0 && amount > 0;
    const isTooMuch = hasAmount && amount - debtAbs > 0.005;
    const canSubmitPayment = hasAmount && !isTooMuch && !isBusy;

    const handleAmountChange = (text: string) => {
        // На українській клавіатурі десятковий роздільник — кома, тому приводимо її до крапки
        const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const [whole, ...fraction] = cleaned.split('.');
        if (fraction.length > 1) return;
        setPaymentAmount(fraction.length ? `${whole}.${fraction[0].slice(0, 2)}` : whole);
    };

    const submitPayment = async () => {
        if (!canSubmitPayment) return;
        setIsBusy(true);
        try {
            await onPay(Math.round(amount * 100) / 100);
            if (fromHistory) onChangeView('history');
            else onClose();
        } catch {
            Alert.alert('Помилка', 'Не вдалося записати оплату. Спробуйте ще раз.');
        } finally {
            setIsBusy(false);
        }
    };

    const goBack = () => (fromHistory ? onChangeView('history') : onClose());

    // ---------- Рендер ----------
    const renderCheckbox = (checked: boolean) => (
        <Icon
            name={checked ? 'check-box' : 'check-box-outline-blank'}
            size={CHECKBOX_SIZE}
            color={checked ? colors.negativeText : colors.iconSecondary}
        />
    );

    const renderGroup = ({ group, matches }: { group: GroupedTransaction; matches: Transaction[] }) => {
        const key = groupKey(group);

        if (group.isPayment) {
            const item = group.items[0];
            const checked = selected.includes(item.id);
            return (
                <TouchableOpacity
                    key={key}
                    style={[styles.paymentRow, { backgroundColor: surface, padding }]}
                    disabled={!isSelecting}
                    onPress={() => toggleItem(item.id)}
                    accessibilityRole={isSelecting ? 'checkbox' : undefined}
                    accessibilityState={isSelecting ? { checked } : undefined}
                >
                    {isSelecting ? renderCheckbox(checked) : <Icon name="success" size={20} color={colors.iconSecondary} />}
                    <View style={styles.flex}>
                        <Text style={[styles.paymentTitle, { color: colors.text, fontSize: itemSize }]}>{PAYMENT_TEXT}</Text>
                        <Text style={[styles.meta, { color: colors.textSecondary }]}>{new Date(group.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.amount, { color: colors.text, fontSize: itemSize }]}>
                        {formatAmount(Math.abs(group.totalAmount))} {currencySymbol}
                    </Text>
                </TouchableOpacity>
            );
        }

        // Під час пошуку й вибору чеки розгорнуті, щоб було видно позиції
        const isExpanded = isSearching || isSelecting || !!expanded[key];
        const items = isSearching && showWholeReceipt ? group.items : matches;
        const groupChecked = group.items.every(item => selected.includes(item.id));
        const count = group.items.length;
        // Гілка як у тредах Reddit: від позначки чека вниз до останньої позиції
        const showThread = isSelecting && items.length > 0;
        const railX = padding + CHECKBOX_SIZE / 2 - THREAD_WIDTH / 2;
        const railArea = padding + CHECKBOX_SIZE + 6;
        const trunkColor = groupChecked ? colors.negativeText : threadColor;

        return (
            <View key={key} style={[styles.group, { backgroundColor: surface }]}>
                <TouchableOpacity
                    style={[styles.groupHeader, { padding }]}
                    onPress={() => (isSelecting ? toggleGroup(group) : setExpanded(prev => ({ ...prev, [key]: !prev[key] })))}
                    accessibilityRole={isSelecting ? 'checkbox' : 'button'}
                    accessibilityState={isSelecting ? { checked: groupChecked } : { expanded: isExpanded }}
                >
                    {showThread && (
                        <View pointerEvents="none" style={[styles.threadTrunk, { left: railX, top: '50%', backgroundColor: trunkColor }]} />
                    )}
                    {/* Фон під позначкою ховає лінію, що проходить під нею */}
                    {isSelecting && <View style={[styles.checkboxMask, { backgroundColor: surface }]}>{renderCheckbox(groupChecked)}</View>}
                    <View style={styles.flex}>
                        <Text style={[styles.groupDate, { color: colors.text, fontSize: itemSize }]}>
                            {new Date(group.date).toLocaleDateString()}
                        </Text>
                        <Text style={[styles.meta, { color: colors.textSecondary }]}>
                            {count} {pluralize(count, 'позиція', 'позиції', 'позицій')}
                        </Text>
                    </View>
                    <Text style={[styles.amount, { color: group.totalAmount >= 0 ? colors.positiveText : colors.negativeText, fontSize: itemSize }]}>
                        {group.totalAmount > 0 ? '+' : ''}{formatAmount(group.totalAmount)} {currencySymbol}
                    </Text>
                    {!isSelecting && !isSearching && (
                        <Icon name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={colors.iconSecondary} />
                    )}
                </TouchableOpacity>

                {isExpanded && items.map((item, index) => {
                    const checked = selected.includes(item.id);
                    const mine = item.fromUserId === user?.id;
                    const row = (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.itemRow,
                                { borderTopColor: colors.border, paddingHorizontal: padding, paddingVertical: padding * 0.75 },
                                showThread && styles.threadRow,
                            ]}
                            disabled={!isSelecting}
                            onPress={() => toggleItem(item.id)}
                            accessibilityRole={isSelecting ? 'checkbox' : undefined}
                            accessibilityState={isSelecting ? { checked } : undefined}
                        >
                            {isSelecting && renderCheckbox(checked)}
                            {/* Коли видно весь чек, знайдений товар виділяємо серед інших */}
                            <Text
                                style={[
                                    styles.itemText,
                                    { color: colors.textSecondary, fontSize: itemSize },
                                    isSearching && isMatch(item) && { color: colors.text },
                                ]}
                                numberOfLines={2}
                            >
                                {isSearching ? highlightMatches(item.text || '') : item.text}
                            </Text>
                            <Text style={[styles.itemAmount, { color: mine ? colors.negativeText : colors.positiveText, fontSize: itemSize }]}>
                                {mine ? '-' : '+'}{formatAmount(Math.abs(item.amount))} {currencySymbol}
                            </Text>
                        </TouchableOpacity>
                    );
                    if (!showThread) return row;

                    const isLast = index === items.length - 1;
                    return (
                        <View key={item.id} style={styles.threadItem}>
                            <View pointerEvents="none" style={{ width: railArea }}>
                                {/* Стовбур іде далі до наступних позицій; на останній гілка закінчується вигином */}
                                {!isLast && (
                                    <View style={[styles.threadTrunk, { left: railX, top: 0, backgroundColor: trunkColor }]} />
                                )}
                                <View
                                    style={[
                                        styles.threadElbow,
                                        {
                                            left: railX,
                                            width: railArea - railX,
                                            borderColor: checked ? colors.negativeText : trunkColor,
                                        },
                                    ]}
                                />
                            </View>
                            {row}
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderSearch = () => hasReceipts && (
        <>
            <View style={[styles.searchField, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Icon name="search" size={20} color={colors.iconSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Пошук товару"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="search"
                    autoCorrect={false}
                    underlineColorAndroid="transparent"
                    accessibilityLabel="Пошук товару в чеках"
                />
                {isSearching && (
                    <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityRole="button"
                        accessibilityLabel="Очистити пошук"
                    >
                        <Icon name="close" size={20} color={colors.iconSecondary} />
                    </TouchableOpacity>
                )}
            </View>
            {isSearching && (
                <TouchableOpacity
                    style={styles.searchOption}
                    onPress={() => setShowWholeReceipt(value => !value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: showWholeReceipt }}
                >
                    <Icon name={showWholeReceipt ? 'check-box' : 'check-box-outline-blank'} size={22} color={showWholeReceipt ? colors.text : colors.iconSecondary} />
                    <Text style={[styles.searchOptionText, { color: colors.text }]}>Показувати весь чек</Text>
                </TouchableOpacity>
            )}
        </>
    );

    const renderList = () => (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
            {visibleGroups.length > 0 ? visibleGroups.map(renderGroup) : (
                <View style={styles.empty}>
                    <Icon name={isSearching ? 'search' : 'receipt'} size={32} color={colors.iconSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {isSearching ? 'Такого товару в чеках немає' : 'Записів поки немає'}
                    </Text>
                </View>
            )}
        </ScrollView>
    );

    const renderFooter = (secondary: { label: string; onPress: () => void; danger?: boolean } | null, primary: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean } | null) => (
        <View style={styles.footer}>
            {secondary && (
                <TouchableOpacity
                    style={[styles.footerButton, { backgroundColor: surface }]}
                    onPress={secondary.onPress}
                    disabled={isBusy}
                    accessibilityRole="button"
                >
                    <Text style={[styles.footerText, { color: secondary.danger ? colors.negativeText : colors.text }]}>{secondary.label}</Text>
                </TouchableOpacity>
            )}
            {primary && (
                <TouchableOpacity
                    style={[
                        styles.footerButton,
                        { backgroundColor: primary.danger ? colors.negativeText : colors.buttonBg },
                        primary.disabled && styles.disabled,
                    ]}
                    onPress={primary.onPress}
                    disabled={primary.disabled || isBusy}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !!primary.disabled }}
                >
                    {isBusy ? <ActivityIndicator color="#fff" /> : (
                        <Text style={[styles.footerText, { color: primary.danger ? '#fff' : colors.buttonText }]}>{primary.label}</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );

    const renderHistory = () => (
        <>
            <View style={[styles.summary, { backgroundColor: surface }]}>
                <Avatar uri={userAvatar} name={userName} size={48} />
                <View style={styles.flex}>
                    <Text style={[styles.meta, { color: colors.textSecondary, fontSize: 13 * textScale }]}>{balanceStatus(totalAmount)}</Text>
                    <Text style={[styles.summaryAmount, { color: amountColor, fontSize: 24 * textScale }]}>
                        {totalAmount > 0 ? '+' : ''}{formatAmount(totalAmount)} {currencySymbol}
                    </Text>
                </View>
            </View>
            {renderSearch()}
            {renderList()}
            {renderFooter(
                allIds.length > 0 ? { label: 'Відхилити записи', onPress: () => onChangeView('select'), danger: true } : null,
                canPay ? { label: 'Сплатити', onPress: () => onChangeView('pay') } : null,
            )}
        </>
    );

    const renderSelect = () => (
        <>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Позначте помилкові записи — їх буде видалено у вас обох.
            </Text>
            <View style={styles.selectBar}>
                <Text style={[styles.selectCount, { color: colors.text }]}>
                    Вибрано {selected.length} з {allIds.length}
                </Text>
                <TouchableOpacity
                    onPress={() => setSelected(isAllSelected ? [] : allIds)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                >
                    <Text style={[styles.selectAll, { color: colors.text }]}>{isAllSelected ? 'Зняти все' : 'Вибрати всі'}</Text>
                </TouchableOpacity>
            </View>
            {renderSearch()}
            {renderList()}
            {renderFooter(
                { label: fromHistory ? 'Назад' : 'Скасувати', onPress: goBack },
                {
                    label: selected.length > 0 ? `Відхилити (${selected.length})` : 'Відхилити',
                    onPress: confirmReject,
                    disabled: selected.length === 0,
                    danger: true,
                },
            )}
        </>
    );

    const renderPay = () => (
        <>
            <View style={[styles.summary, { backgroundColor: surface }]}>
                <Avatar uri={userAvatar} name={userName} size={48} />
                <View style={styles.flex}>
                    <Text style={[styles.meta, { color: colors.textSecondary, fontSize: 13 * textScale }]} numberOfLines={1}>
                        Ви винні {userName}
                    </Text>
                    <Text style={[styles.summaryAmount, { color: colors.negativeText, fontSize: 24 * textScale }]}>
                        {formatAmount(debtAbs)} {currencySymbol}
                    </Text>
                </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Скільки ви повернули</Text>
            <View
                style={[
                    styles.amountField,
                    { backgroundColor: colors.inputBg, borderColor: isTooMuch ? colors.negativeText : colors.border },
                ]}
            >
                <TextInput
                    style={[styles.amountInput, { color: colors.text, fontSize: 28 * textScale }]}
                    keyboardType="decimal-pad"
                    value={paymentAmount}
                    onChangeText={handleAmountChange}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={submitPayment}
                    accessibilityLabel="Сума оплати"
                />
                <Text style={[styles.amountCurrency, { color: colors.textSecondary, fontSize: 20 * textScale }]}>{currencySymbol}</Text>
            </View>
            {isTooMuch ? (
                <Text style={[styles.errorText, { color: colors.negativeText }]}>
                    Сума більша за борг ({formatAmount(debtAbs)} {currencySymbol})
                </Text>
            ) : (
                <View style={styles.chips}>
                    <TouchableOpacity
                        style={[styles.chip, { backgroundColor: surface }]}
                        onPress={() => setPaymentAmount(String(Number(debtAbs.toFixed(2))))}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.chipText, { color: colors.text }]}>Вся сума</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.chip, { backgroundColor: surface }]}
                        onPress={() => setPaymentAmount(String(Number((debtAbs / 2).toFixed(2))))}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.chipText, { color: colors.text }]}>Половина</Text>
                    </TouchableOpacity>
                </View>
            )}

            {renderFooter(
                { label: fromHistory ? 'Назад' : 'Скасувати', onPress: goBack },
                {
                    label: hasAmount && !isTooMuch ? `Сплатити ${formatAmount(amount)} ${currencySymbol}` : 'Сплатити',
                    onPress: submitPayment,
                    disabled: !canSubmitPayment,
                },
            )}
        </>
    );

    const title = view === 'pay' ? PAYMENT_TEXT : view === 'select' ? 'Відхилити записи' : userName;

    return (
        <BottomSheet visible={visible} onClose={onClose} title={title}>
            {view === 'pay' ? renderPay() : view === 'select' ? renderSelect() : renderHistory()}
        </BottomSheet>
    );
};

export default DebtSheet;

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    summaryAmount: {
        fontFamily: 'NunitoSansExtraBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
        marginTop: 2,
    },
    meta: {
        fontSize: 13,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    searchField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        paddingVertical: 8,
    },
    searchOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
        marginBottom: 4,
    },
    searchOptionText: {
        fontSize: 14,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    list: {
        flexShrink: 1,
    },
    listContent: {
        gap: 8,
        paddingVertical: 4,
    },
    group: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
    },
    groupDate: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    amount: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    highlight: {
        color: '#1A1A1A',
        fontFamily: 'NunitoSansBold',
        borderRadius: 3,
    },
    checkboxMask: {
        borderRadius: 4,
    },
    threadItem: {
        flexDirection: 'row',
    },
    threadTrunk: {
        position: 'absolute',
        bottom: 0,
        width: THREAD_WIDTH,
    },
    // Вигин від стовбура до позиції: ліва і нижня рамки із заокругленим кутом
    threadElbow: {
        position: 'absolute',
        top: 0,
        height: '50%',
        borderLeftWidth: THREAD_WIDTH,
        borderBottomWidth: THREAD_WIDTH,
        borderBottomLeftRadius: 10,
    },
    threadRow: {
        flex: 1,
        paddingLeft: 4,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 44,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    itemText: {
        flex: 1,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    itemAmount: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        borderRadius: 16,
    },
    paymentTitle: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    empty: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    hint: {
        fontSize: 14,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginBottom: 12,
    },
    selectBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    selectCount: {
        fontSize: 15,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    selectAll: {
        fontSize: 15,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        textDecorationLine: 'underline',
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginBottom: 8,
    },
    amountField: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        minHeight: 64,
    },
    amountInput: {
        flex: 1,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
        paddingVertical: 8,
    },
    amountCurrency: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginLeft: 8,
    },
    errorText: {
        fontSize: 13,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginTop: 8,
        minHeight: 36,
    },
    chips: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    chip: {
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        justifyContent: 'center',
    },
    chipText: {
        fontSize: 14,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    footerButton: {
        flex: 1,
        minHeight: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    footerText: {
        fontSize: 16,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    disabled: {
        opacity: 0.5,
    },
});
