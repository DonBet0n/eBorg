import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import DebtItemComponent from '../DebtItem';
import { User, DebtItem } from '../../types/debt';
import { useFirebase, NewDebt } from '../../contexts/FirebaseContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatAmount, splitAmount } from '../../utils/debtCalculations';
import ConfirmDebtModal from './ConfirmDebtModal';
import UserSelectionModal from './UserSelectionModal';
import ErrorToast from '../ui/ErrorToast';
import QRScannerModal from '../QRScannerModal';
import {
    AddItemButton, ClearFormButton, FormFooter, GroupIcon, ItemsHeader, PersonRow, SectionHeader,
    displayName, formStyles, useFormColors,
} from './FormParts';

interface MultyTabProps {
    userList: User[];
    onHasItemsChange?: (hasItems: boolean) => void;
    // Шапка екрана прокручується разом з формою
    header?: React.ReactNode;
}

const MultyTab: React.FC<MultyTabProps> = ({ userList, onHasItemsChange, header }) => {
    const { user: currentUser, createDebts, notifyUser } = useFirebase();
    const { colors, textScale, currencySymbol } = useAppTheme();
    const { surface } = useFormColors();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    // Що обираємо у вікні зі списком людей: платника чи учасників
    const [userSelector, setUserSelector] = useState<'payer' | 'participants'>('payer');
    const [selectedUsersMulty, setSelectedUsersMulty] = useState<User[]>([]);
    const [totalItemsMulty, setTotalItemsMulty] = useState<DebtItem[]>([]);
    const [userItemsMulty, setUserItemsMulty] = useState<{ [userId: string]: DebtItem[] }>({});
    // Спільні витрати відкриті одразу: з них найчастіше починають
    const [isTotalDropdownOpen, setTotalDropdownOpen] = useState(true);
    const [userDropdownOpen, setUserDropdownOpen] = useState<{ [key: string]: boolean }>({});
    const [debtReceiverUser, setDebtReceiverUser] = useState<User | null>(null);
    const [isScannerVisible, setIsScannerVisible] = useState(false);

    // Стан для розділення боргу
    const [splitItemState, setSplitItemState] = useState<{userId: string, index: number, x: number, y: number, width: number, height: number} | null>(null);
    const [splitStep, setSplitStep] = useState<'menu' | 'users'>('menu');
    const [splitSelectedUsers, setSplitSelectedUsers] = useState<User[]>([]);

    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);

    const hasItems = totalItemsMulty.length > 0 ||
                     Object.keys(userItemsMulty).some(k => userItemsMulty[k].length > 0);
    const hasData = selectedUsersMulty.length > 0 || debtReceiverUser !== null || hasItems;

    useEffect(() => {
        onHasItemsChange?.(hasItems);
    }, [hasItems, onHasItemsChange]);

    const itemRefs = useRef<Record<string, { focusDescription: () => void }>>({});

    // --- Вибір людей ---
    const openUserListModal = useCallback((selector: 'payer' | 'participants') => {
        setUserSelector(selector);
        setUserListModalVisible(true);
    }, []);

    const closeUserListModal = useCallback(() => {
        setUserListModalVisible(false);
    }, []);

    const isUserParticipant = useCallback((user: User) => selectedUsersMulty.some(u => u.id === user.id), [selectedUsersMulty]);

    const selectPayer = useCallback((user: User) => {
        setDebtReceiverUser(user);
        // Той, хто платив, зазвичай теж ділить чек, тому додаємо його до учасників; зняти можна в списку учасників
        setSelectedUsersMulty(prevUsers => prevUsers.some(u => u.id === user.id) ? prevUsers : [...prevUsers, user]);
        setUserListModalVisible(false);
    }, []);

    const toggleParticipant = useCallback((user: User) => {
        setSelectedUsersMulty(prevUsers =>
            prevUsers.some(u => u.id === user.id)
                ? prevUsers.filter(u => u.id !== user.id)
                : [...prevUsers, user]
        );
    }, []);

    // --- Позиції ---
    const addTotalItemMulty = useCallback((newItemId: string) => {
        setTotalItemsMulty(prevItems => [...prevItems, { id: newItemId, text: '', num: '0' }]);
    }, []);

    const addUserItemMulty = useCallback((userId: string, newItemId: string) => {
        setUserItemsMulty(prevUserItems => ({
            ...prevUserItems,
            [userId]: [...(prevUserItems[userId] || []), { id: newItemId, text: '', num: '0' }]
        }));
    }, []);

    const handleAddTotalItem = useCallback(() => {
        const newItemId = String(Date.now()) + Math.random().toString(36).substr(2, 5);
        addTotalItemMulty(newItemId);
        setTimeout(() => {
            itemRefs.current[newItemId]?.focusDescription();
        }, 100);
    }, [addTotalItemMulty]);

    const handleAddUserItem = useCallback((userId: string) => {
        const newItemId = String(Date.now()) + Math.random().toString(36).substr(2, 5);
        addUserItemMulty(userId, newItemId);
        setTimeout(() => {
            itemRefs.current[newItemId]?.focusDescription();
        }, 100);
    }, [addUserItemMulty]);

    const updateDebtItemMultyTotal = useCallback((index: number, field: 'text' | 'num', value: string) => {
        setTotalItemsMulty(prevItems =>
            prevItems.map((item, i) => {
                if (i === index) {
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    }, []);

    const deleteTotalItemMulty = useCallback((index: number) => {
        setTotalItemsMulty(prevItems => prevItems.filter((_, i) => i !== index));
    }, []);

    const updateUserItemMulty = useCallback((userId: string, index: number, field: 'text' | 'num', value: string) => {
        setUserItemsMulty(prevUserItems => {
            const userItems = prevUserItems[userId] || [];
            const updatedUserItems = userItems.map((item, i) => {
                if (i === index) {
                    if (field === 'num') {
                        return { ...item, [field]: value, multiplier: 1, baseNum: undefined };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            });
            return { ...prevUserItems, [userId]: updatedUserItems };
        });
    }, []);

    const deleteUserItemMulty = useCallback((userId: string, index: number) => {
        setUserItemsMulty(prevUserItems => {
            const userItems = prevUserItems[userId] || [];
            const updatedUserItems = userItems.filter((_, i) => i !== index);
            return { ...prevUserItems, [userId]: updatedUserItems };
        });
    }, []);

    // --- Розділення та множення позиції ---
    const handleSplitPress = useCallback((userId: string, index: number, x: number, y: number, width: number, height: number) => {
        setSplitItemState({ userId, index, x, y, width, height });
        setSplitStep('menu');
        setSplitSelectedUsers([]);
    }, []);

    const handleMultiplierChange = useCallback((delta: number) => {
        if (!splitItemState) return;

        setUserItemsMulty(prevUserItems => {
            const { userId, index } = splitItemState;
            const userItems = prevUserItems[userId] || [];
            const item = userItems[index];
            if (!item) return prevUserItems;

            let currentMultiplier = item.multiplier !== undefined ? item.multiplier : 1;

            let newMultiplier = currentMultiplier + delta;
            if (currentMultiplier === 1 && delta === -1) {
                newMultiplier = -2;
            } else if (currentMultiplier === -2 && delta === 1) {
                newMultiplier = 1;
            }

            let baseNum = item.baseNum;
            if (!baseNum) {
                baseNum = item.num;
            }

            const baseAmount = parseFloat(baseNum) || 0;
            let newAmountNum = baseAmount;

            if (newMultiplier > 0) {
                newAmountNum = baseAmount * newMultiplier;
            } else if (newMultiplier < 0) {
                newAmountNum = baseAmount / Math.abs(newMultiplier);
            }

            const newAmount = Number(newAmountNum.toFixed(2)).toString();

            const updatedUserItems = [...userItems];
            updatedUserItems[index] = {
                ...item,
                num: newAmount,
                multiplier: newMultiplier,
                baseNum
            };

            return { ...prevUserItems, [userId]: updatedUserItems };
        });
    }, [splitItemState]);

    const handleSplitUserSelection = useCallback((user: User) => {
        setSplitSelectedUsers(prev =>
            prev.some(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );
    }, []);

    const confirmSplit = useCallback(() => {
        if (!splitItemState) return;
        if (splitSelectedUsers.length === 0) {
            setSplitItemState(null);
            return;
        }

        const { userId, index } = splitItemState;
        const originalItem = userItemsMulty[userId]?.[index];
        if (!originalItem || !originalItem.num || parseFloat(originalItem.num) === 0) {
            setSplitItemState(null);
            return;
        }

        const shares = splitAmount(parseFloat(originalItem.num), splitSelectedUsers.length + 1);

        // Оновити оригінальний запис
        updateUserItemMulty(userId, index, 'num', shares[0].toString());

        // Додати нові записи вибраним користувачам
        splitSelectedUsers.forEach((splitUser, splitIndex) => {
            setUserItemsMulty(prev => {
                const userItems = prev[splitUser.id] || [];
                // Якщо є тільки один пустий запис, ми його перезапишемо
                const hasEmptyItem = userItems.length === 1 && userItems[0].text === '' && (userItems[0].num === '0' || userItems[0].num === '');

                const newItem = { id: String(Date.now() + Math.random()), text: originalItem.text, num: shares[splitIndex + 1].toString() };

                let newItemsList;
                if (hasEmptyItem) {
                    newItemsList = [newItem];
                } else {
                    newItemsList = [...userItems, newItem];
                }

                return { ...prev, [splitUser.id]: newItemsList };
            });
        });

        setSplitItemState(null);
        setSplitSelectedUsers([]);
    }, [splitItemState, splitSelectedUsers, userItemsMulty, updateUserItemMulty]);

    // --- Підрахунки ---
    const calculateSummaryForUser = useCallback((userId: string) => {
        return (userItemsMulty[userId] || []).reduce((sum, item) => sum + (parseFloat(item.num) || 0), 0);
    }, [userItemsMulty]);

    const calculateTotalMulty = useCallback(() => {
        return totalItemsMulty.reduce((sum, item) => {
            const num = parseFloat(item.num) || 0;
            return sum + num;
        }, 0);
    }, [totalItemsMulty]);

    const calculateGrandTotal = useCallback(() => {
        const totalShared = calculateTotalMulty();
        const totalPersonal = selectedUsersMulty.reduce((sum, user) => {
            return sum + calculateSummaryForUser(user.id);
        }, 0);
        return totalShared + totalPersonal;
    }, [calculateTotalMulty, selectedUsersMulty, calculateSummaryForUser]);

    // Спільні витрати діляться на ВСІХ учасників (включаючи платника, якщо він серед них).
    // Зайві копійки дістаються боржникам, тому тут найменша частка — саме вона припадає на платника.
    const perUserShare = selectedUsersMulty.length > 0
        ? totalItemsMulty.reduce((sum, item) => sum + splitAmount(Number(item.num) || 0, selectedUsersMulty.length)[selectedUsersMulty.length - 1], 0)
        : 0;

    // Записи, які буде створено. Суми на екрані рахуються з них же, тому збігаються зі створеними боргами.
    const buildDebts = (deptId: string): NewDebt[] => {
        if (!debtReceiverUser) return [];
        const newDebts: NewDebt[] = [];

        // 1. Окремі борги для кожної спільної позиції
        // Платник сам собі не винен
        const debtors = selectedUsersMulty.filter(user => user.id !== debtReceiverUser.id);

        totalItemsMulty.forEach((totalItem, itemIndex) => {
            if (totalItem.num) {
                // Частка рахується на ВСІХ учасників; зайві копійки йдуть боржникам, щоб платник отримав повну суму
                const shares = splitAmount(Number(totalItem.num), selectedUsersMulty.length);
                // Від позиції до позиції зайва копійка дістається наступному боржнику
                const offset = debtors.length > 0 ? itemIndex % debtors.length : 0;

                [...debtors.slice(offset), ...debtors.slice(0, offset)].forEach((user, shareIndex) => {
                    if (shares[shareIndex] <= 0) return;

                    newDebts.push({
                        deptId: deptId,
                        fromUserId: user.id,
                        toUserId: debtReceiverUser.id,
                        text: totalItem.text?.trim()
                            ? `${totalItem.text} (спільні витрати)`
                            : 'Без опису (спільні витрати)',
                        amount: shares[shareIndex],
                    });
                });
            }
        });

        // 2. Окремі борги для особистих позицій учасників
        selectedUsersMulty.forEach(user => {
            // Особисті позиції платника боргом не стають
            if (user.id === debtReceiverUser.id) return;

            const userItems = userItemsMulty[user.id] || [];
            userItems.forEach(item => {
                if (item.num) {
                    newDebts.push({
                        deptId: deptId,
                        fromUserId: user.id,
                        toUserId: debtReceiverUser.id,
                        text: item.text?.trim() || 'Без опису',
                        amount: Number(Number(item.num).toFixed(2)),
                    });
                }
            });
        });

        return newDebts;
    };

    const sumOwedByUser = (debts: NewDebt[]) => {
        const owed: Record<string, number> = {};
        debts.forEach(debt => {
            owed[debt.fromUserId] = (owed[debt.fromUserId] || 0) + debt.amount;
        });
        return owed;
    };

    const previewDebts = buildDebts('');
    const owedByUser = sumOwedByUser(previewDebts);
    const owedTotal = previewDebts.reduce((sum, debt) => sum + debt.amount, 0);
    const debtors = selectedUsersMulty.filter(u => (owedByUser[u.id] || 0) > 0);
    const sharedTotal = calculateTotalMulty();
    const grandTotal = calculateGrandTotal();
    const itemsCount = totalItemsMulty.length +
        selectedUsersMulty.reduce((acc, user) => acc + (userItemsMulty[user.id] || []).length, 0);

    const resetForm = useCallback(() => {
        setTotalItemsMulty([]);
        setUserItemsMulty({});
        setSelectedUsersMulty([]);
        setDebtReceiverUser(null);
    }, []);

    const confirmClear = () => {
        Alert.alert(
            'Очистити форму?',
            'Обраних людей і всі позиції буде прибрано.',
            [
                { text: 'Скасувати', style: 'cancel' },
                { text: 'Очистити', style: 'destructive', onPress: resetForm },
            ]
        );
    };

    // --- Створення ---
    const validateDebtItems = () => {
        if (!debtReceiverUser || selectedUsersMulty.length === 0) {
            setError('Оберіть, хто платив, і учасників');
            return false;
        }

        // Чек записує той, хто платив: так кожен борг стосується автора запису
        if (debtReceiverUser.id !== currentUser?.id) {
            setError('Чек може записати лише той, хто платив');
            return false;
        }

        // Сума має бути числом більше нуля: порожнє поле чи сама крапка не проходять
        const isEmptyAmount = (item: DebtItem) => !(Number(item.num) > 0);

        // Перевіряємо лише позиції учасників: позицій тих, кого прибрали зі списку, на екрані немає
        const hasEmptyAmount = totalItemsMulty.some(isEmptyAmount) ||
            selectedUsersMulty.some(user => (userItemsMulty[user.id] || []).some(isEmptyAmount));

        if (hasEmptyAmount) {
            setError('Вкажіть суму в кожній позиції або видаліть порожні');
            return false;
        }

        if (previewDebts.length === 0) {
            setError('Нікому нічого не нараховано: додайте позиції та учасників');
            return false;
        }

        return true;
    };

    const handleCreateDebtMulty = () => {
        setError(null); // Clear previous error
        if (!validateDebtItems()) return;

        setConfirmModalVisible(true);
    };

    const confirmDebtCreation = async () => {
        setError(null);
        if (!debtReceiverUser || selectedUsersMulty.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const newDebts = buildDebts(Date.now().toString());

            await createDebts(newDebts);

            // Push-сповіщення: суми рахуємо з реально створених записів, щоб вони збігались з боргами.
            // notifyUser сам пропускає того, хто створює борг.
            const owed = sumOwedByUser(newDebts);
            const notified = selectedUsersMulty.filter(u => (owed[u.id] || 0) > 0);
            notified.forEach(debtor => {
                notifyUser(debtor.id, 'eBorg', `${debtReceiverUser.name}: ваш борг ${Number(owed[debtor.id].toFixed(2))} ${currencySymbol}`);
            });
            if (notified.length > 0) {
                const totalOwed = notified.reduce((sum, debtor) => sum + owed[debtor.id], 0);
                const names = notified.map(debtor => debtor.name).filter(Boolean).join(', ');
                notifyUser(debtReceiverUser.id, 'eBorg', `${names}: борг вам ${Number(totalOwed.toFixed(2))} ${currencySymbol}`);
            }

            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setConfirmModalVisible(false);
                resetForm();
            }, 2000);

        } catch (error) {
            console.error('Error creating multy debts:', error);
            // Повідомлення про помилку живе на формі, тому вікно підтвердження закриваємо
            setConfirmModalVisible(false);
            setError('Не вдалося створити борг. Спробуйте ще раз');
        } finally {
            setIsSubmitting(false);
        }
    };

    // У режимі перегляду розгортаємо всі блоки з позиціями, щоб чек було видно цілком
    const toggleViewMode = () => {
        if (!isViewMode) {
            if (totalItemsMulty.length > 0) setTotalDropdownOpen(true);
            setUserDropdownOpen(prev => {
                const next = { ...prev };
                selectedUsersMulty.forEach(user => {
                    if ((userItemsMulty[user.id] || []).length > 0) next[user.id] = true;
                });
                return next;
            });
        }
        setIsViewMode(!isViewMode);
    };

    const toggleTotalDropdown = useCallback(() => {
        setTotalDropdownOpen(prev => !prev);
    }, []);

    const toggleUserDropdown = useCallback((userId: string) => {
        setUserDropdownOpen(prev => ({ ...prev, [userId]: !prev[userId] }));
    }, []);

    const money = (amount: number) => `${formatAmount(amount)} ${currencySymbol}`;

    // З чого складається частка людини в чеку
    const describeUserPart = (personal: number, shared: number) => {
        if (personal > 0 && shared > 0) return `Особисті ${formatAmount(personal)} + спільні ${formatAmount(shared)}`;
        if (personal > 0) return `Особисті ${formatAmount(personal)}`;
        if (shared > 0) return `Частка спільних ${formatAmount(shared)}`;
        return 'Немає позицій';
    };

    const renderEmptyHint = () => (
        <Text style={[formStyles.hint, { color: colors.textSecondary, fontSize: 13 * textScale }]}>Немає позицій</Text>
    );

    return (
        <View style={formStyles.container}>
            <ScrollView
                contentContainerStyle={formStyles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {header}
                {/* Хто платив і між ким ділимо */}
                <View style={[formStyles.card, { backgroundColor: surface }]}>
                    <PersonRow
                        label="Хто платив"
                        placeholder="Обрати людину"
                        users={debtReceiverUser ? [debtReceiverUser] : []}
                        onPress={() => openUserListModal('payer')}
                    />
                    <PersonRow
                        label="Учасники"
                        placeholder="Обрати, між ким ділити"
                        users={selectedUsersMulty}
                        multiple
                        onPress={() => openUserListModal('participants')}
                        divider
                    />
                </View>

                {/* Що саме: спільне і особисте кожного */}
                <ItemsHeader
                    isViewMode={isViewMode}
                    onToggleViewMode={toggleViewMode}
                    onScan={() => setIsScannerVisible(true)}
                />

                <View style={[formStyles.card, formStyles.itemsCard, { backgroundColor: surface }]}>
                    <SectionHeader
                        leading={<GroupIcon />}
                        title="Спільні витрати"
                        subtitle={selectedUsersMulty.length > 0
                            ? `Порівну на ${selectedUsersMulty.length} · по ${money(perUserShare)}`
                            : 'Діляться порівну між учасниками'}
                        amount={money(sharedTotal)}
                        isOpen={isTotalDropdownOpen}
                        onPress={toggleTotalDropdown}
                    />
                    {isTotalDropdownOpen && (
                        <View style={formStyles.items}>
                            {totalItemsMulty.map((item, index) => (
                                <DebtItemComponent
                                    ref={el => { if (el) itemRefs.current[item.id] = el; }}
                                    key={item.id}
                                    id={item.id}
                                    text={item.text}
                                    num={item.num.toString()}
                                    onTextChange={(text) => updateDebtItemMultyTotal(index, 'text', text)}
                                    onNumChange={(num) => updateDebtItemMultyTotal(index, 'num', num)}
                                    onDelete={() => deleteTotalItemMulty(index)}
                                    isLast={false}
                                    isOnly={false} // <-- дозволяє видаляти всі поля
                                    onAdd={handleAddTotalItem}
                                    isViewMode={isViewMode}
                                    index={index}
                                    totalCount={totalItemsMulty.length}
                                />
                            ))}
                            {isViewMode
                                ? totalItemsMulty.length === 0 && renderEmptyHint()
                                : <AddItemButton onPress={handleAddTotalItem} />}
                        </View>
                    )}
                </View>

                {selectedUsersMulty.length === 0 && (
                    <Text style={[formStyles.hint, { color: colors.textSecondary, fontSize: 13 * textScale }]}>
                        Оберіть учасників, і для кожного з&apos;явиться блок з особистими позиціями.
                    </Text>
                )}

                {selectedUsersMulty.map((user) => {
                    const isPayer = debtReceiverUser?.id === user.id;
                    const isOpen = !!userDropdownOpen[user.id];
                    const userItems = userItemsMulty[user.id] || [];
                    const personal = calculateSummaryForUser(user.id);
                    // Для боржника показуємо рівно ту суму, що стане боргом; для платника — його частку чека
                    const amount = debtReceiverUser && !isPayer ? (owedByUser[user.id] || 0) : perUserShare + personal;
                    const shared = Math.max(0, Number((amount - personal).toFixed(2)));

                    return (
                        <View key={user.id} style={[formStyles.card, formStyles.itemsCard, { backgroundColor: surface }]}>
                            <SectionHeader
                                leading={<Avatar uri={user.avatar} name={user.name} size={40} />}
                                title={displayName(user)}
                                badge={isPayer ? 'платник' : undefined}
                                subtitle={describeUserPart(personal, shared)}
                                amount={money(amount)}
                                isOpen={isOpen}
                                onPress={() => toggleUserDropdown(user.id)}
                            />
                            {isOpen && (
                                <View style={formStyles.items}>
                                    {userItems.map((item, index) => (
                                        <DebtItemComponent
                                            ref={el => { if (el) itemRefs.current[item.id] = el; }}
                                            key={item.id}
                                            id={item.id}
                                            text={item.text}
                                            num={item.num.toString()}
                                            onTextChange={(text) => updateUserItemMulty(user.id, index, 'text', text)}
                                            onNumChange={(num) => updateUserItemMulty(user.id, index, 'num', num)}
                                            onDelete={() => deleteUserItemMulty(user.id, index)}
                                            isLast={false}
                                            isOnly={false}
                                            onAdd={() => handleAddUserItem(user.id)}
                                            onSplit={(x, y, w, h) => handleSplitPress(user.id, index, x, y, w, h)}
                                            isViewMode={isViewMode}
                                            index={index}
                                            totalCount={userItems.length}
                                        />
                                    ))}
                                    {isViewMode
                                        ? userItems.length === 0 && renderEmptyHint()
                                        : <AddItemButton onPress={() => handleAddUserItem(user.id)} />}
                                </View>
                            )}
                        </View>
                    );
                })}

                {hasData && (
                    <View>
                        <ClearFormButton onPress={confirmClear} />
                    </View>
                )}
            </ScrollView>

            {/* Скільки разом і головна дія */}
            <FormFooter
                rows={debtReceiverUser
                    ? [
                        { label: 'Сума чека', value: money(grandTotal) },
                        { label: 'Сума боргів', value: money(owedTotal), primary: true },
                    ]
                    : [{ label: 'Сума чека', value: money(grandTotal), primary: true }]}
                buttonLabel="Створити борг"
                onPress={handleCreateDebtMulty}
            >
                <ErrorToast error={error} onHide={() => setError(null)} style={formStyles.toast} />
            </FormFooter>

            <UserSelectionModal
                visible={isUserListModalVisible}
                onClose={closeUserListModal}
                title={userSelector === 'payer' ? 'Хто платив' : 'Учасники'}
                userList={userList}
                currentUserId={currentUser?.id}
                multiple={userSelector === 'participants'}
                isSelected={(user) => userSelector === 'payer' ? debtReceiverUser?.id === user.id : isUserParticipant(user)}
                onSelect={userSelector === 'payer' ? selectPayer : toggleParticipant}
                getTag={(user) => userSelector === 'participants' && debtReceiverUser?.id === user.id ? 'платник' : undefined}
            />

            {/* Меню позиції: розділити з іншими учасниками або помножити чи поділити суму */}
            {splitItemState && (() => {
                const windowWidth = Dimensions.get('window').width;
                const windowHeight = Dimensions.get('window').height;

                // Розраховуємо ідеальну позицію:
                // Хочемо щоб центр вікна (приблизно 100px від правого краю вікна) співпадав з центром кнопки.
                // Якщо ця позиція вилазить за екран (right < 16), то фіксуємо right = 16.
                const buttonCenter = splitItemState.x + (splitItemState.width / 2);
                const idealRightPos = windowWidth - buttonCenter - 100; // 100 - половина орієнтовної ширини вікна
                const clampedRightPos = Math.max(16, idealRightPos);

                const splitItem = (userItemsMulty[splitItemState.userId] || [])[splitItemState.index];
                const multiplier = splitItem?.multiplier !== undefined ? splitItem.multiplier : 1;
                const otherParticipants = selectedUsersMulty.filter(u => u.id !== splitItemState.userId);

                return (
                    <Modal transparent={true} visible={true} animationType="fade" statusBarTranslucent={true} onRequestClose={() => setSplitItemState(null)}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            onPress={() => setSplitItemState(null)}
                            activeOpacity={1}
                            accessibilityLabel="Закрити меню позиції"
                        />
                        <View style={[
                            styles.popoverContainer,
                            {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                bottom: windowHeight - splitItemState.y + 8,
                                right: clampedRightPos
                            }
                        ]}>
                            {splitStep === 'menu' ? (
                                <View>
                                    <TouchableOpacity
                                        style={styles.popoverMenuRow}
                                        onPress={() => setSplitStep('users')}
                                        accessibilityRole="button"
                                    >
                                        <Icon name="call-split" size={20} color={colors.iconSecondary} />
                                        <Text style={[styles.popoverUserName, { color: colors.text }]}>Розділити з іншими</Text>
                                    </TouchableOpacity>

                                    <View style={[styles.multiplierContainer, { borderTopColor: colors.border }]}>
                                        <TouchableOpacity
                                            style={[styles.multiplierButton, { backgroundColor: surface }]}
                                            onPress={() => handleMultiplierChange(-1)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Зменшити множник суми"
                                        >
                                            <Icon name="remove" size={16} color={colors.icon} />
                                        </TouchableOpacity>

                                        {/* Додатний множник множить суму, від'ємний — ділить */}
                                        <Text style={[styles.multiplierText, { color: colors.text }]}>
                                            {multiplier > 0 ? `×${multiplier}` : `÷${Math.abs(multiplier)}`}
                                        </Text>

                                        <TouchableOpacity
                                            style={[styles.multiplierButton, { backgroundColor: surface }]}
                                            onPress={() => handleMultiplierChange(1)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Збільшити множник суми"
                                        >
                                            <Icon name="add" size={16} color={colors.icon} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.popoverUsersContainer}>
                                    <Text style={[styles.popoverTitle, { color: colors.textSecondary }]}>Розділити з:</Text>
                                    {otherParticipants.length === 0 && (
                                        <Text style={[styles.popoverEmpty, { color: colors.textSecondary }]}>Немає інших учасників</Text>
                                    )}
                                    <ScrollView style={styles.popoverScrollView} contentContainerStyle={{ flexGrow: 0 }}>
                                        {otherParticipants.map(user => {
                                            const isSelected = splitSelectedUsers.some(u => u.id === user.id);
                                            return (
                                                <TouchableOpacity
                                                    key={user.id}
                                                    style={[styles.popoverUserRow, { borderBottomColor: colors.border }]}
                                                    onPress={() => handleSplitUserSelection(user)}
                                                    accessibilityRole="checkbox"
                                                    accessibilityState={{ checked: isSelected }}
                                                >
                                                    <Icon
                                                        name={isSelected ? "check-box" : "check-box-outline-blank"}
                                                        size={24}
                                                        color={isSelected ? colors.text : colors.iconSecondary}
                                                    />
                                                    <Text style={[styles.popoverUserName, { color: colors.text }]} numberOfLines={1}>{displayName(user)}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                    <TouchableOpacity style={[styles.popoverConfirmButton, { backgroundColor: colors.buttonBg }]} onPress={confirmSplit} accessibilityRole="button">
                                        <Text style={[styles.popoverConfirmText, { color: colors.buttonText }]}>Готово</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </Modal>
                );
            })()}

            <ConfirmDebtModal
                visible={confirmModalVisible}
                onClose={() => {
                    setConfirmModalVisible(false);
                    setIsSuccess(false);
                }}
                onConfirm={confirmDebtCreation}
                summary={debtReceiverUser ? {
                    rows: [
                        { label: 'Платник', value: displayName(debtReceiverUser) },
                        { label: 'Боржники', value: debtors.map(displayName).join(', ') || '—' },
                        { label: 'Позицій', value: String(itemsCount) },
                        { label: 'Сума чека', value: money(grandTotal) },
                    ],
                    amountLabel: 'Сума боргів',
                    amount: owedTotal,
                } : null}
                isSuccess={isSuccess}
                isSubmitting={isSubmitting}
            />

            <QRScannerModal
                visible={isScannerVisible}
                onClose={() => setIsScannerVisible(false)}
                users={selectedUsersMulty}
                onAddUserItem={(userId, item) => {
                    setUserItemsMulty(prev => ({
                        ...prev,
                        [userId]: [...(prev[userId] || []), item]
                    }));
                }}
                onAddTotalItem={(item) => {
                    setTotalItemsMulty(prev => [...prev, item]);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    popoverContainer: {
        position: 'absolute',
        borderRadius: 16,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
    },
    popoverMenuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        paddingHorizontal: 8,
    },
    popoverUsersContainer: {
        minWidth: 180,
        maxWidth: 250,
    },
    popoverTitle: {
        fontSize: 14,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        marginBottom: 8,
        textAlign: 'center',
    },
    popoverEmpty: {
        fontSize: 13,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        textAlign: 'center',
        paddingVertical: 8,
    },
    popoverScrollView: {
        maxHeight: 176,
    },
    popoverUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    popoverUserName: {
        fontSize: 14,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginLeft: 8,
        flexShrink: 1,
    },
    popoverConfirmButton: {
        minHeight: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    popoverConfirmText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        fontSize: 14,
    },
    multiplierContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingTop: 8,
        paddingBottom: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        marginTop: 4,
    },
    multiplierButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    multiplierText: {
        minWidth: 32,
        textAlign: 'center',
        fontSize: 16,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
});

export default MultyTab;
