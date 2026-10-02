import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DebtItemComponent from '../DebtItem';
import { User, DebtItem } from '../../types/debt';
import { useFirebase, NewDebt } from '../../contexts/FirebaseContext';

import ConfirmDebtModal from './ConfirmDebtModal';
import UserSelectionModal from './UserSelectionModal';
import ErrorToast from '../ui/ErrorToast';
import AddScreenStyles from '../../styles/AddScreenStyles';
import { useAppTheme } from '../../contexts/ThemeContext';
import QRScannerModal from '../QRScannerModal';
import Animated, { LinearTransition } from 'react-native-reanimated';

interface MultyTabProps {
    userList: User[];
    onHasDataChange?: (hasData: boolean) => void;
}

const MultyTab: React.FC<MultyTabProps> = ({ userList, onHasDataChange }) => {
    const { createDebts, notifyUser } = useFirebase();
    const { colors, textScale, currencySymbol } = useAppTheme();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    const [selectedUsersMulty, setSelectedUsersMulty] = useState<User[]>([]);
    const [totalItemsMulty, setTotalItemsMulty] = useState<DebtItem[]>([]);
    const [userItemsMulty, setUserItemsMulty] = useState<{ [userId: string]: DebtItem[] }>({});
    const [isTotalDropdownOpen, setTotalDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState<{ [key: string]: boolean }>({});
    const [debtReceiverUser, setDebtReceiverUser] = useState<User | null>(null);
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    
    // Стан для розділення боргу
    const [splitItemState, setSplitItemState] = useState<{userId: string, index: number, x: number, y: number, width: number, height: number} | null>(null);
    const [splitStep, setSplitStep] = useState<'menu' | 'users'>('menu');
    const [splitSelectedUsers, setSplitSelectedUsers] = useState<User[]>([]);

    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);

    useEffect(() => {
        const hasData = selectedUsersMulty.length > 0 || 
                        debtReceiverUser !== null || 
                        totalItemsMulty.length > 0 || 
                        Object.keys(userItemsMulty).some(k => userItemsMulty[k].length > 0);
        onHasDataChange?.(hasData);
    }, [selectedUsersMulty, debtReceiverUser, totalItemsMulty, userItemsMulty, onHasDataChange]);

    const itemRefs = useRef<Record<string, { focusDescription: () => void }>>({});

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

    // Multy Tab функції
    const openUserListModal = useCallback(() => {
        setUserListModalVisible(true);
    }, []);

    const closeUserListModal = useCallback(() => {
        setUserListModalVisible(false);
    }, []);


    const calculateSummaryForUser = useCallback((userId: string) => {
        return (userItemsMulty[userId] || []).reduce((sum, item) => sum + (parseFloat(item.num) || 0), 0);
    }, [userItemsMulty]);

    const calculateDebtForUser = useCallback((user: User) => {
        if (!debtReceiverUser) return 0;
        
        // Якщо це той самий користувач, повертаємо 0
        if (user.id === debtReceiverUser.id) {
            return 0;
        }
        
        // Спільні витрати поділені на ВСІХ учасників (включаючи отримувача)
        const totalSharedAmount = totalItemsMulty.reduce((sum, item) => sum + (parseFloat(item.num) || 0), 0);
        const perUserShare = totalSharedAmount / selectedUsersMulty.length;
        
        // Персональні витрати користувача
        const userPersonalAmount = calculateSummaryForUser(user.id);
        
        return parseFloat((perUserShare + userPersonalAmount).toFixed(2));
    }, [totalItemsMulty, selectedUsersMulty, calculateSummaryForUser, debtReceiverUser]);

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

    // Тепер perUserShare показує поділ на всіх учасників
    const perUserShare = selectedUsersMulty.length > 0 
        ? Number((calculateTotalMulty() / selectedUsersMulty.length).toFixed(2))
        : 0;

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

        const totalUsersCount = splitSelectedUsers.length + 1;
        const newAmount = Number((parseFloat(originalItem.num) / totalUsersCount).toFixed(2)).toString();

        // Оновити оригінальний запис
        updateUserItemMulty(userId, index, 'num', newAmount);

        // Додати нові записи вибраним користувачам
        splitSelectedUsers.forEach(splitUser => {
            setUserItemsMulty(prev => {
                const userItems = prev[splitUser.id] || [];
                // Якщо є тільки один пустий запис, ми його перезапишемо
                const hasEmptyItem = userItems.length === 1 && userItems[0].text === '' && (userItems[0].num === '0' || userItems[0].num === '');
                
                const newItem = { id: String(Date.now() + Math.random()), text: originalItem.text, num: newAmount };
                
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

    const showError = (message: string) => {
        setError(message);
    };

    const validateDebtItems = () => {
        if (!debtReceiverUser || selectedUsersMulty.length === 0) {
            showError('Виберіть отримувача та учасників');
            return false;
        }
    
        const hasEmptyAmount = totalItemsMulty.some(item => 
            !item.num || Number(item.num) === 0
        );
    
        // Перевіряємо тільки ті елементи, що існують
        const hasEmptyUserAmount = Object.values(userItemsMulty).some(items =>
            items && items.length > 0 && items.some(item => !item.num || Number(item.num) === 0)
        );
    
        if (hasEmptyAmount || hasEmptyUserAmount) {
            showError('Видаліть елементи з нульовою сумою');
            return false;
        }
    
        return true;
    };

    const handleCreateDebtMulty = useCallback(async () => {
        setError(null); // Clear previous error
        if (!validateDebtItems()) return;
        
        setConfirmModalVisible(true);
    }, [validateDebtItems]);

    const confirmDebtCreation = async () => {
        setError(null); // Clear error on success
        if (!debtReceiverUser || selectedUsersMulty.length === 0) return;
        
        const deptId = Date.now().toString();
        try {
            const newDebts: NewDebt[] = [];

            // 1. Створюємо окремі борги для кожного спільного товару
            totalItemsMulty.forEach(totalItem => {
                if (totalItem.num) {
                    const itemAmount = Number(totalItem.num);
                    // Розраховуємо частку для ВСІХ учасників
                    const perUserShare = Number((itemAmount / selectedUsersMulty.length).toFixed(2));

                    // При створенні боргів пропускаємо отримувача
                    selectedUsersMulty.forEach(user => {
                        if (user.id === debtReceiverUser.id) return; // Пропускаємо отримувача

                        newDebts.push({
                            deptId: deptId,
                            fromUserId: user.id,
                            toUserId: debtReceiverUser.id,
                            text: totalItem.text?.trim() 
                                ? `${totalItem.text} (спільні витрати)` 
                                : 'Без опису (спільні витрати)',
                            amount: perUserShare,
                        });
                    });
                }
            });

            // 2. Створюємо окремі борги для індивідуальних товарів користувачів
            selectedUsersMulty.forEach(user => {
                // Пропускаємо створення індивідуальних боргів для отримувача
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

            await createDebts(newDebts);
            
            // Push-сповіщення: суми рахуємо з реально створених записів, щоб вони збігались з боргами.
            // notifyUser сам пропускає того, хто створює борг.
            const owedByUser: Record<string, number> = {};
            newDebts.forEach(debt => {
                owedByUser[debt.fromUserId] = (owedByUser[debt.fromUserId] || 0) + debt.amount;
            });
            const debtors = selectedUsersMulty.filter(u => (owedByUser[u.id] || 0) > 0);
            debtors.forEach(debtor => {
                notifyUser(debtor.id, 'eBorg', `Ви винні ${debtReceiverUser.name} ${Number(owedByUser[debtor.id].toFixed(2))} грн.`);
            });
            if (debtors.length > 0) {
                const totalOwed = debtors.reduce((sum, debtor) => sum + owedByUser[debtor.id], 0);
                const names = debtors.map(debtor => debtor.name).filter(Boolean).join(', ');
                notifyUser(debtReceiverUser.id, 'eBorg', `Вам винні ${names} ${Number(totalOwed.toFixed(2))} грн.`);
            }

            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setConfirmModalVisible(false);
                // Reset form
                setTotalItemsMulty([]);
                setUserItemsMulty({});
                setSelectedUsersMulty([]);
                setDebtReceiverUser(null);
            }, 2000);

        } catch (error) {
            console.error('Error creating multy debts:', error);
            setError('Помилка при створенні боргу');
        }
    };

    const toggleTotalDropdown = useCallback(() => {
        setTotalDropdownOpen(prev => !prev);
    }, []);

    const toggleUserDropdown = useCallback((userId: string) => {
        setUserDropdownOpen(prev => ({ ...prev, [userId]: !prev[userId] }));
    }, []);

    const handleUserSelectionChangeMulty = useCallback((user: User, isParticipant: boolean, isReceiver: boolean) => {
        // Спочатку обробляємо receiver
        if (isReceiver) {
            setDebtReceiverUser(debtReceiverUser?.id === user.id ? null : user);
        }

        // Потім обробляємо участь, незалежно від того чи є користувач отримувачем
        if (isParticipant) {
            setSelectedUsersMulty(prevUsers => {
                if (!prevUsers.some(u => u.id === user.id)) {
                    return [...prevUsers, user];
                }
                return prevUsers;
            });
        } else {
            setSelectedUsersMulty(prevUsers => 
                prevUsers.filter(u => u.id !== user.id)
            );
        }
    }, [debtReceiverUser]);

    const isUserParticipant = useCallback((user: User) => selectedUsersMulty.some(u => u.id === user.id), [selectedUsersMulty]);

    return (
        <ScrollView 
            style={styles.multyTabContainer}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }}
        >

            {/* Top Bar: User Selection and Grand Total */}
            <View style={styles.multyTopBarContainer}>
                <TouchableOpacity style={styles.multyUserSelectorContainer} onPress={openUserListModal}>
                    <View style={[styles.multyUserButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                        <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                    </View>
                    <Text style={[styles.multyAllUsersText, { color: colors.text, fontSize: 16 * textScale }]} numberOfLines={1} ellipsizeMode="tail">
                        {selectedUsersMulty.length > 0
                            ? selectedUsersMulty.map(user => user.name).join(', ')
                            : 'Всі користувачі'}
                    </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                    <TouchableOpacity 
                        style={{ backgroundColor: colors.buttonBg, alignItems: 'center', justifyContent: 'center', borderRadius: 12, width: 48, marginRight: 10 }}
                        onPress={() => setIsScannerVisible(true)}
                    >
                        <MaterialIcons name="qr-code-scanner" size={24} color={colors.buttonText} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={{ backgroundColor: isViewMode ? colors.buttonBg : colors.inputBg, borderColor: isViewMode ? colors.buttonBg : colors.border, borderWidth: isViewMode ? 0 : 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, width: 48, marginRight: 10 }}
                        onPress={() => setIsViewMode(!isViewMode)}
                    >
                        <MaterialIcons name={isViewMode ? "visibility-off" : "visibility"} size={24} color={isViewMode ? colors.buttonText : colors.icon} />
                    </TouchableOpacity>

                    <View style={[styles.topGrandTotalIsland, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                        <Text style={[styles.topGrandTotalText, { color: colors.text, fontSize: 20 * textScale }]}>{calculateGrandTotal().toFixed(2)}</Text>
                        <Text style={[styles.topGrandTotalCurrency, { color: colors.textSecondary, fontSize: 16 * textScale }]}>{currencySymbol}</Text>
                    </View>
                </View>
            </View>



            {/* User List Modal with Checkboxes for Multy */}
            <UserSelectionModal
                visible={isUserListModalVisible}
                onClose={closeUserListModal}
                userList={userList}
                mode="multy"
                receiverId={debtReceiverUser?.id}
                isUserParticipant={isUserParticipant}
                onSelectMulty={handleUserSelectionChangeMulty}
            />

            {/* Modal for Popover Split */}
            {splitItemState && (() => {
                const windowWidth = Dimensions.get('window').width;
                const windowHeight = Dimensions.get('window').height;
                
                // Розраховуємо ідеальну позицію:
                // Хочемо щоб центр вікна (приблизно 100px від правого краю вікна) співпадав з центром кнопки.
                // Якщо ця позиція вилазить за екран (right < 16), то фіксуємо right = 16.
                const buttonCenter = splitItemState.x + (splitItemState.width / 2);
                const idealRightPos = windowWidth - buttonCenter - 100; // 100 - половина орієнтовної ширини вікна
                const clampedRightPos = Math.max(16, idealRightPos);

                return (
                    <Modal transparent={true} visible={true} animationType="fade" statusBarTranslucent={true}>
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill} 
                            onPress={() => setSplitItemState(null)} 
                            activeOpacity={1}
                        />
                        <View style={[
                            styles.popoverContainer, 
                            { 
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                position: 'absolute',
                                bottom: windowHeight - splitItemState.y + 8,
                                right: clampedRightPos
                            }
                        ]}>
                            {splitStep === 'menu' ? (
                                <View>
                                    <TouchableOpacity 
                                        style={[styles.popoverUserRow, { borderBottomWidth: 0, paddingVertical: 8, paddingHorizontal: 4 }]}
                                        onPress={() => setSplitStep('users')}
                                    >
                                        <MaterialIcons name="call-split" size={24} color={colors.iconSecondary} />
                                        <Text style={[styles.popoverUserName, { flex: 0, color: colors.text }]}>Розділити</Text>
                                    </TouchableOpacity>
                                    
                                    <View style={[styles.multiplierContainer, { borderTopColor: colors.border }]}>
                                        <TouchableOpacity style={[styles.multiplierButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={() => handleMultiplierChange(-1)}>
                                            <MaterialIcons name="remove" size={16} color={colors.icon} />
                                        </TouchableOpacity>
                                        
                                        <Text style={[styles.multiplierText, { color: colors.text }]}>
                                            {(() => {
                                                const userItems = userItemsMulty[splitItemState.userId] || [];
                                                const item = userItems[splitItemState.index];
                                                return (item?.multiplier !== undefined ? item.multiplier : 1) + 'x';
                                            })()}
                                        </Text>

                                        <TouchableOpacity style={[styles.multiplierButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={() => handleMultiplierChange(1)}>
                                            <MaterialIcons name="add" size={16} color={colors.icon} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.popoverUsersContainer}>
                                    <Text style={[styles.popoverTitle, { color: colors.textSecondary }]}>Розділити з:</Text>
                                    <ScrollView style={styles.popoverScrollView} contentContainerStyle={{ flexGrow: 0 }}>
                                        {selectedUsersMulty.filter(u => u.id !== splitItemState.userId).map(user => {
                                            const isSelected = splitSelectedUsers.some(u => u.id === user.id);
                                            return (
                                                <TouchableOpacity 
                                                    key={user.id} 
                                                    style={[styles.popoverUserRow, { borderBottomColor: colors.border }]}
                                                    onPress={() => handleSplitUserSelection(user)}
                                                >
                                                    <MaterialIcons
                                                        name={isSelected ? "check-box" : "check-box-outline-blank"}
                                                        size={24}
                                                        color={isSelected ? colors.positiveText : colors.iconSecondary}
                                                    />
                                                    <Text style={[styles.popoverUserName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                    <TouchableOpacity style={[styles.popoverConfirmButton, { backgroundColor: colors.buttonBg }]} onPress={confirmSplit}>
                                        <Text style={[styles.popoverConfirmText, { color: colors.buttonText }]}>ОК</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </Modal>
                );
            })()}

            {/* Total Row for Multy */}
            <Animated.View layout={LinearTransition.duration(200)} style={[styles.multyTotalRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity 
                    style={styles.multyTotalHeader} 
                    onPress={toggleTotalDropdown}
                >
                    <View style={styles.multyTotalLabelContainer}>
                        <Text style={[styles.multyTotalLabelText, { color: colors.text }]}>TOTAL</Text>
                        <MaterialIcons 
                            name={isTotalDropdownOpen ? "arrow-drop-up" : "arrow-drop-down"} 
                            size={20} 
                            color={colors.iconSecondary} 
                        />
                    </View>
                    <View style={styles.summaryDebtContainer}>
                        <Text style={[styles.multySummaryText, { color: colors.textSecondary }]}>Загальна сума: {calculateTotalMulty().toFixed(2)}</Text>
                        {selectedUsersMulty.length > 0 && (
                            <Text style={[styles.multyDebtText, { color: colors.text }]}>Поділ: {perUserShare.toFixed(2)} на кожного</Text>
                        )}
                    </View>
                </TouchableOpacity>
                <View>
                    {/* Додаємо кнопку, якщо totalItemsMulty.length === 0 */}
                    {isTotalDropdownOpen && totalItemsMulty.length === 0 && (
                        <TouchableOpacity 
                            style={[styles.addFirstItemButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={handleAddTotalItem}
                        >
                            <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                            <Text style={[styles.addFirstItemText, { color: colors.textSecondary }]}>Додати спільний борг</Text>
                        </TouchableOpacity>
                    )}
                    {isTotalDropdownOpen && totalItemsMulty.map((item, index) => (
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
                    {isTotalDropdownOpen && totalItemsMulty.length > 0 && !isViewMode && (
                        <TouchableOpacity onPress={handleAddTotalItem} style={[styles.addButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>


            {/* User Rows for Multy */}
            {selectedUsersMulty.map((user) => (
                <Animated.View key={user.id} layout={LinearTransition.duration(200)} style={[styles.multyUserSection, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity 
                        style={styles.multyUserRowHeader} 
                        onPress={() => {
                            toggleUserDropdown(user.id);
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.multyUserNameText, { color: colors.text }]}>{user.name}</Text>
                            <MaterialIcons 
                                name={userDropdownOpen[user.id] ? "arrow-drop-up" : "arrow-drop-down"} 
                                size={20} 
                                color={colors.iconSecondary} 
                            />
                        </View>
                        <View style={styles.summaryDebtContainer}>
                            <Text style={[styles.multySummaryText, { color: colors.textSecondary }]}>Загальна сума: {calculateSummaryForUser(user.id)}</Text>
                            <Text style={[styles.multyDebtText, { color: colors.text }]}>Борг до {debtReceiverUser?.name || '...'} : {calculateDebtForUser(user)}</Text>
                        </View>
                    </TouchableOpacity>
                    {userDropdownOpen[user.id] && (
                        <View>
                            {/* Кнопка додавання, якщо немає елементів */}
                            {(!userItemsMulty[user.id] || userItemsMulty[user.id].length === 0) ? (
                                <TouchableOpacity 
                                    style={[styles.addFirstItemButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => handleAddUserItem(user.id)}
                                >
                                    <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                                    <Text style={[styles.addFirstItemText, { color: colors.textSecondary }]}>Додати персональний борг</Text>
                                </TouchableOpacity>
                            ) : (
                                (userItemsMulty[user.id] || []).map((item, index) => (
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
                                        totalCount={(userItemsMulty[user.id] || []).length}
                                    />
                                ))
                            )}
                            {userDropdownOpen[user.id] && userItemsMulty[user.id] && userItemsMulty[user.id].length > 0 && !isViewMode && (
                                <TouchableOpacity onPress={() => handleAddUserItem(user.id)} style={[styles.addButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </Animated.View>
            ))}

            {/* Bottom Add Debt Button for Multy */}
            <Animated.View layout={LinearTransition.duration(200)} style={{ marginTop: 'auto', marginBottom: 0 }}>
                <TouchableOpacity
                    style={[AddScreenStyles.createButton, { backgroundColor: colors.buttonBg }]}
                    onPress={handleCreateDebtMulty}
                >
                    <Text style={[AddScreenStyles.createButtonText, { color: colors.buttonText, fontSize: 16 * textScale }]}>Створити борг</Text>
                </TouchableOpacity>
            </Animated.View>

            <ConfirmDebtModal
                visible={confirmModalVisible}
                onClose={() => {
                    setConfirmModalVisible(false);
                    setIsSuccess(false);
                }}
                onConfirm={confirmDebtCreation}
                debtInfo={debtReceiverUser ? {
                    fromUser: selectedUsersMulty.map(u => u.name).join(', '),
                    toUser: debtReceiverUser.name,
                    totalAmount: calculateGrandTotal(),
                    itemsCount: totalItemsMulty.length + 
                        Object.values(userItemsMulty).reduce((acc, items) => acc + items.length, 0)
                } : null}
                isSuccess={isSuccess}
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

            <ErrorToast error={error} onHide={() => setError(null)} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    multyTabContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    multyTopBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 20,
    },
    multyUserSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    multyUserButton: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
        marginRight: 10,
        minWidth: 45,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    multyAllUsersText: {
        fontSize: 16,
        fontFamily: 'MontserratBold',
        flex: 1,
    },
    topGrandTotalIsland: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    topGrandTotalText: {
        fontSize: 18,
        fontFamily: 'MontserratBold',
        color: '#000',
    },
    topGrandTotalCurrency: {
        fontSize: 12,
        fontFamily: 'Montserrat',
        color: '#666',
        marginLeft: 4,
        marginTop: 4,
    },
    multyTotalRow: {
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    multyUserSection: {
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    multyUserRowHeader: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    multyTotalLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    multyTotalLabelText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 5,
    },
    multyUserNameText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 5,
        marginBottom: 5,
    },
    multySummaryText: {
        fontSize: 14,
        color: 'grey',
        marginRight: 10,
    },
    multyDebtText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    multyCreateButton: {
        marginBottom: 15,
    },
    summaryDebtContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    multyTotalHeader: {
        marginBottom: 10,
    },
    addFirstItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginVertical: 10,
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
    addFirstItemText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
        fontFamily: 'Montserrat',
    },
    popoverContainer: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    popoverMenuItem: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    popoverMenuText: {
        fontSize: 16,
        fontFamily: 'MontserratBold',
        color: '#000',
    },
    popoverUsersContainer: {
        minWidth: 150,
        maxWidth: 250,
    },
    popoverTitle: {
        fontSize: 14,
        fontFamily: 'MontserratBold',
        color: '#666',
        marginBottom: 8,
        textAlign: 'center',
    },
    popoverScrollView: {
        maxHeight: 150,
    },
    popoverUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    popoverUserName: {
        fontSize: 14,
        fontFamily: 'Montserrat',
        marginLeft: 8,
        flex: 1,
    },
    popoverConfirmButton: {
        backgroundColor: '#000',
        borderRadius: 6,
        paddingVertical: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    popoverConfirmText: {
        color: '#fff',
        fontFamily: 'MontserratBold',
        fontSize: 14,
    },
    multiplierContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        marginTop: 4,
    },
    multiplierButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    multiplierText: {
        fontSize: 16,
        fontFamily: 'MontserratBold',
        color: '#000',
    },
});

export default MultyTab;