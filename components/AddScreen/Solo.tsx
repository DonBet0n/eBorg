import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DebtItemComponent from '../DebtItem';
import { User, DebtItem } from '../../types/debt';
import { useFirebase } from '../../contexts/FirebaseContext';

import Animated, { LinearTransition } from 'react-native-reanimated';
import ConfirmDebtModal from './ConfirmDebtModal';
import UserSelectionModal from './UserSelectionModal';
import ErrorToast from '../ui/ErrorToast';
import AddScreenStyles from '../../styles/AddScreenStyles';
import { useAppTheme } from '../../contexts/ThemeContext';
import QRScannerModal from '../QRScannerModal';

interface SoloTabProps {
    userList: User[];
    onHasDataChange?: (hasData: boolean) => void;
}

const SoloTab: React.FC<SoloTabProps> = ({ userList, onHasDataChange }) => {
    const { createDebts, notifyUser } = useFirebase();
    const { colors, textScale, currencySymbol } = useAppTheme();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    const [debtItemsSolo, setDebtItemsSolo] = useState<DebtItem[]>([{ id: '1', text: '', num: '0' }]);
    const [selectedUserSolo1, setSelectedUserSolo1] = useState<User | null>(null);
    const [selectedUserSolo2, setSelectedUserSolo2] = useState<User | null>(null);
    const [currentUserSelectorSolo, setCurrentUserSelectorSolo] = useState<'user1' | 'user2' | null>(null);
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    
    useEffect(() => {
        const hasData = selectedUserSolo1 !== null || 
                        selectedUserSolo2 !== null || 
                        debtItemsSolo.length > 1 || 
                        (debtItemsSolo[0] && (debtItemsSolo[0].text.trim() !== '' || debtItemsSolo[0].num !== '0'));
        onHasDataChange?.(hasData);
    }, [selectedUserSolo1, selectedUserSolo2, debtItemsSolo, onHasDataChange]);

    const lastItemRef = useRef<{ focusDescription: () => void }>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);

    // --- Функції Modal User List ---
    const openUserListModal = useCallback(() => {
        setUserListModalVisible(true);
    }, []);

    const closeUserListModal = useCallback(() => {
        setUserListModalVisible(false);
        setCurrentUserSelectorSolo(null); // Reset selector when closing modal
    }, []);

    // --- Функції для Solo Tab ---
    const openUserListModalSolo = useCallback((selector: 'user1' | 'user2') => {
        setCurrentUserSelectorSolo(selector);
        openUserListModal();
    }, [openUserListModal]);


    const handleUserSelectionChangeSolo = useCallback((user: User) => {
        if (currentUserSelectorSolo === 'user1') {
            setSelectedUserSolo1(user);
            if (selectedUserSolo2?.id === user.id) {
                setSelectedUserSolo1(null);
                Vibration.vibrate(500);
                return;
            }
        } else if (currentUserSelectorSolo === 'user2') {
            setSelectedUserSolo2(user);
            if (selectedUserSolo1?.id === user.id) {
                setSelectedUserSolo2(null);
                Vibration.vibrate(500);
                return;
            }
        }
        closeUserListModal();
    }, [closeUserListModal, currentUserSelectorSolo, selectedUserSolo2, selectedUserSolo1]);


    const calculateTotalSolo = useCallback(() => {
        return debtItemsSolo.reduce((sum, item) => {
            const num = parseFloat(item.num) || 0;
            return sum + num;
        }, 0);
    }, [debtItemsSolo]);

    const addDebtItemSolo = useCallback(() => {
        setDebtItemsSolo(prevItems => [...prevItems, { id: String(Date.now()), text: '', num: '0' }]);
        setTimeout(() => {
            lastItemRef.current?.focusDescription();
        }, 100);
    }, []);

    const deleteDebtItemSolo = useCallback((id: string) => {
        setDebtItemsSolo(prevItems => prevItems.length <= 1 ? prevItems : prevItems.filter(item => item.id !== id));
    }, []);

    const updateDebtItemSolo = useCallback((id: string, field: 'text' | 'num', value: string) => {
        setDebtItemsSolo(prevItems =>
            prevItems.map(item => {
                if (item.id === id) {
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    }, []);

    const showError = (message: string) => {
        setError(message);
    };

    const validateDebtItems = () => {
        if (!selectedUserSolo1 || !selectedUserSolo2) {
            showError('Виберіть користувачів');
            return false;
        }

        const hasEmptyAmount = debtItemsSolo.some(item => 
            !item.num || Number(item.num) === 0
        );

        if (hasEmptyAmount) {
            showError('Видаліть елементи з нульовою сумою');
            return false;
        }

        return true;
    };

    const handleCreateDebtSolo = useCallback(async () => {
        setError(null); // Clear previous error
        if (!validateDebtItems()) return;
        
        setConfirmModalVisible(true);
    }, [validateDebtItems]);

    const confirmDebtCreation = async () => {
        setError(null); // Clear error on success
        if (!selectedUserSolo1 || !selectedUserSolo2) return;
        
        try {
            const deptId = Date.now().toString();

            await createDebts(debtItemsSolo
                .filter(item => item.num)
                .map(item => ({
                    deptId: deptId,
                    fromUserId: selectedUserSolo1.id,
                    toUserId: selectedUserSolo2.id,
                    text: item.text?.trim() || 'Без опису',
                    amount: Number(Number(item.num).toFixed(2)),
                })));
            
            // Push-сповіщення кожному учаснику, крім того, хто створює борг (notifyUser сам пропускає себе)
            const debtor = selectedUserSolo1;
            const creditor = selectedUserSolo2;
            const totalAmount = Number(debtItemsSolo
                .reduce((sum, item) => sum + (parseFloat(item.num) || 0), 0)
                .toFixed(2));
            notifyUser(debtor.id, 'eBorg', `Ви винні ${creditor.name} ${totalAmount} грн.`);
            notifyUser(creditor.id, 'eBorg', `Вам винен ${debtor.name} ${totalAmount} грн.`);

            setIsSuccess(true);
            // Reset form after delay
            setTimeout(() => {
                setIsSuccess(false);
                setConfirmModalVisible(false);
                setDebtItemsSolo([{ id: '1', text: '', num: '0' }]);
                setSelectedUserSolo1(null);
                setSelectedUserSolo2(null);
            }, 2000);

        } catch (error) {
            console.error('Error creating debts:', error);
            setError('Помилка при створенні боргу');
        }
    };

    return (
        <View style={styles.soloTabContainer}>
            {/* Person Selector for Solo */}
            <View style={styles.personSelectorContainer}>
                <TouchableOpacity
                    style={AddScreenStyles.userSelectorContainer}
                    onPress={() => openUserListModalSolo('user1')}
                >
                    <View style={[AddScreenStyles.userButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                        {selectedUserSolo1 ? (
                            <Text style={[AddScreenStyles.selectedUserName, { color: colors.text, fontSize: 16 * textScale }]}>{selectedUserSolo1.name}</Text>
                        ) : (
                            <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                        )}
                    </View>
                </TouchableOpacity>

                <MaterialIcons
                    name={"arrow-forward"}
                    size={30}
                    color={colors.icon}
                />

                <TouchableOpacity
                    style={AddScreenStyles.userSelectorContainer}
                    onPress={() => openUserListModalSolo('user2')}
                >
                    <View style={[AddScreenStyles.userButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                        {selectedUserSolo2 ? (
                            <Text style={[AddScreenStyles.selectedUserName, { color: colors.text, fontSize: 16 * textScale }]}>{selectedUserSolo2.name}</Text>
                        ) : (
                            <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <UserSelectionModal
                visible={isUserListModalVisible}
                onClose={closeUserListModal}
                userList={userList}
                mode="solo"
                selectedUserId={currentUserSelectorSolo === 'user1' ? selectedUserSolo1?.id : selectedUserSolo2?.id}
                onSelectSolo={handleUserSelectionChangeSolo}
            />



            {/* Debt Items List for Solo */}
            <Animated.FlatList
                data={debtItemsSolo}
                keyExtractor={(item) => item.id}
                itemLayoutAnimation={LinearTransition}
                renderItem={({ item, index }) => (
                    <DebtItemComponent
                        ref={index === debtItemsSolo.length - 1 ? lastItemRef : null}
                        id={item.id}
                        text={item.text}
                        num={item.num.toString()}
                        onTextChange={(text) => updateDebtItemSolo(item.id, 'text', text)}
                        onNumChange={(num) => updateDebtItemSolo(item.id, 'num', num)}
                        onDelete={() => deleteDebtItemSolo(item.id)}
                        isLast={false} // No longer used inside
                        isOnly={debtItemsSolo.length === 1}
                        onAdd={() => {}} // No longer used inside
                        isViewMode={isViewMode}
                        index={index}
                        totalCount={debtItemsSolo.length}
                    />
                )}
                ListFooterComponent={
                    !isViewMode ? (
                        <TouchableOpacity onPress={addDebtItemSolo} style={[styles.addButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <MaterialIcons name="add" size={24} color={colors.iconSecondary} />
                        </TouchableOpacity>
                    ) : null
                }
                style={styles.debtItemList}
            />

            {/* Total with Create Button for Solo */}
            <View style={[styles.bottomContainer, { borderTopColor: colors.border }]}>
                <View style={[styles.totalContainer, { borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', marginRight: 12 }}>
                        <TouchableOpacity 
                            style={{ backgroundColor: colors.buttonBg, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, width: 48, height: 48, marginRight: 8 }}
                            onPress={() => setIsScannerVisible(true)}
                        >
                            <MaterialIcons name="qr-code-scanner" size={24} color={colors.buttonText} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={{ backgroundColor: isViewMode ? colors.buttonBg : colors.inputBg, borderColor: isViewMode ? colors.buttonBg : colors.border, borderWidth: isViewMode ? 0 : 1, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, width: 48, height: 48 }}
                            onPress={() => setIsViewMode(!isViewMode)}
                        >
                            <MaterialIcons name={isViewMode ? "visibility-off" : "visibility"} size={24} color={isViewMode ? colors.buttonText : colors.icon} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                        <Text style={[styles.totalText, { color: colors.text, fontSize: 18 * textScale }]}>Total</Text>
                        <View style={styles.totalValueContainer}>
                            <Text style={[styles.totalValue, { color: colors.text, fontSize: 20 * textScale }]}>{calculateTotalSolo()}</Text>
                            <Text style={[styles.currency, { color: colors.textSecondary, fontSize: 16 * textScale }]}> {currencySymbol}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[AddScreenStyles.createButton, { backgroundColor: colors.buttonBg }]}
                    onPress={handleCreateDebtSolo}
                >
                    <Text style={[AddScreenStyles.createButtonText, { color: colors.buttonText, fontSize: 16 * textScale }]}>Створити борг</Text>
                </TouchableOpacity>
            </View>

            <ConfirmDebtModal
                visible={confirmModalVisible}
                onClose={() => {
                    setConfirmModalVisible(false);
                    setIsSuccess(false);
                }}
                onConfirm={confirmDebtCreation}
                debtInfo={{
                    fromUser: selectedUserSolo1?.name || 'Unknown',
                    toUser: selectedUserSolo2?.name || 'Unknown',
                    totalAmount: calculateTotalSolo(),
                    itemsCount: debtItemsSolo.length
                }}
                isSuccess={isSuccess}
            />

            <QRScannerModal
                visible={isScannerVisible}
                onClose={() => setIsScannerVisible(false)}
                users={[selectedUserSolo1, selectedUserSolo2].filter((u): u is User => u !== null)}
                onAddUserItem={(userId, item) => {
                    setDebtItemsSolo(prev => {
                        // Якщо є пустий елемент спочатку, заміняємо його
                        if (prev.length === 1 && prev[0].text === '' && prev[0].num === '0') {
                            return [item];
                        }
                        return [...prev, item];
                    });
                }}
                onAddTotalItem={(item) => {
                    setDebtItemsSolo(prev => {
                        if (prev.length === 1 && prev[0].text === '' && prev[0].num === '0') return [item];
                        return [...prev, item];
                    });
                }}
            />

            <ErrorToast error={error} onHide={() => setError(null)} />
        </View>
    );
};

const styles = StyleSheet.create({
    soloTabContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    personSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    debtItemList: {
        marginBottom: 10,
        flexGrow: 1,
    },
    bottomContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: 5,
    },
    currency: {
        fontSize: 16,
        color: 'grey',
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

export default SoloTab;