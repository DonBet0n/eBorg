import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, Modal, ScrollView, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DebtItemComponent from '../../components/DebtItem';
import { User, DebtItem } from '../../types/debt';
import { useFirebase } from '../../contexts/FirebaseContext';
import { addDoc, collection } from 'firebase/firestore';
import ConfirmDebtModal from './ConfirmDebtModal';

interface MultyTabProps {
    userList: User[];
}

const MultyTab: React.FC<MultyTabProps> = ({ userList }) => {
    const { db } = useFirebase();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    const [selectedUsersMulty, setSelectedUsersMulty] = useState<User[]>([]);
    const [totalItemsMulty, setTotalItemsMulty] = useState<DebtItem[]>([]);
    const [userItemsMulty, setUserItemsMulty] = useState<{ [userId: string]: DebtItem[] }>({});
    const [isTotalDropdownOpen, setTotalDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState<{ [key: string]: boolean }>({});
    const [debtReceiverUser, setDebtReceiverUser] = useState<User | null>(null);
    const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const lastItemRef = useRef<{ focusDescription: () => void }>(null);

    const addTotalItemMulty = useCallback(() => {
        setTotalItemsMulty(prevItems => [...prevItems, { id: String(Date.now()), text: '', num: '0' }]);
    }, []);

    const addUserItemMulty = useCallback((userId: string) => {
        setUserItemsMulty(prevUserItems => ({
            ...prevUserItems,
            [userId]: [...(prevUserItems[userId] || []), { id: String(Date.now()), text: '', num: '0' }]
        }));
    }, []);

    const handleAddTotalItem = useCallback(() => {
        addTotalItemMulty();
        setTimeout(() => {
            lastItemRef.current?.focusDescription();
        }, 100);
    }, [addTotalItemMulty]);

    const handleAddUserItem = useCallback((userId: string) => {
        addUserItemMulty(userId);
        setTimeout(() => {
            lastItemRef.current?.focusDescription();
        }, 100);
    }, [addUserItemMulty]);

    // Multy Tab функції
    const openUserListModal = useCallback(() => {
        setUserListModalVisible(true);
    }, []);

    const closeUserListModal = useCallback(() => {
        setUserListModalVisible(false);
    }, []);

    const toggleUserSelection = useCallback((user: User) => {
        setSelectedUsersMulty(prevUsers => {
            return prevUsers.some(u => u.id === user.id)
                ? prevUsers.filter(u => u.id !== user.id)
                : [...prevUsers, user];
        });
    }, []);

    const isUserSelected = useCallback((user: User) => selectedUsersMulty.some(u => u.id === user.id), [selectedUsersMulty]);

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

    const showError = (message: string) => {
        setError(message);
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(3000),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => setError(null));
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
            const debtPromises: Promise<any>[] = [];

            // 1. Створюємо окремі борги для кожного спільного товару
            totalItemsMulty.forEach(totalItem => {
                if (totalItem.num) {
                    const itemAmount = Number(totalItem.num);
                    // Розраховуємо частку для ВСІХ учасників
                    const perUserShare = Number((itemAmount / selectedUsersMulty.length).toFixed(2));

                    // При створенні боргів пропускаємо отримувача
                    selectedUsersMulty.forEach(user => {
                        if (user.id === debtReceiverUser.id) return; // Пропускаємо отримувача

                        const sharedDebt = {
                            deptId: deptId,
                            fromUserId: user.id,
                            toUserId: debtReceiverUser.id,
                            text: totalItem.text?.trim() 
                                ? `${totalItem.text} (спільні витрати)` 
                                : 'Без опису (спільні витрати)',
                            amount: perUserShare,
                            createdAt: new Date(),
                        };

                        debtPromises.push(
                            addDoc(collection(db, 'debts'), sharedDebt)
                        );
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
                        const personalDebt = {
                            deptId: deptId,
                            fromUserId: user.id,
                            toUserId: debtReceiverUser.id,
                            text: item.text?.trim() || 'Без опису',
                            amount: Number(Number(item.num).toFixed(2)),
                            createdAt: new Date(),
                        };

                        debtPromises.push(
                            addDoc(collection(db, 'debts'), personalDebt)
                        );
                    }
                });
            });

            await Promise.all(debtPromises);
            console.log('Створено групові борги з ID:', deptId);

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
    const isUserReceiver = useCallback((user: User) => debtReceiverUser?.id === user.id, [debtReceiverUser]);

    const getInputRef = useCallback((type: 'text' | 'num', index: number) => `${type}_${index}`, []);
    const getUserInputRef = useCallback((userId: string, type: 'text' | 'num', index: number) => `${userId}_${type}_${index}`, []);

    const focusNextInput = useCallback((currentType: 'text' | 'num', currentIndex: number, isMultyTotal?: boolean) => {
        const nextRef = inputRefs.current[getInputRef(currentType === 'text' ? 'num' : 'text', currentIndex)];
        if (nextRef) {
            nextRef.focus();
        } else if (currentType === 'num' && isMultyTotal) {
            addTotalItemMulty();
            setTimeout(() => {
                inputRefs.current[getInputRef('text', totalItemsMulty.length)]?.focus();
            }, 100);
        }
    }, [getInputRef, addTotalItemMulty, totalItemsMulty]);

    const focusNextUserInput = useCallback((userId: string, currentType: 'text' | 'num', currentIndex: number) => {
        const nextRef = inputRefs.current[getUserInputRef(userId, currentType === 'text' ? 'num' : 'text', currentIndex)];
        if (nextRef) {
            nextRef.focus();
        } else if (currentType === 'num') {
            addUserItemMulty(userId);
            setTimeout(() => {
                inputRefs.current[getUserInputRef(userId, 'text', (userItemsMulty[userId] || []).length)]?.focus();
            }, 100);
        }
    }, [getUserInputRef, addUserItemMulty, userItemsMulty]);

    return (
        <ScrollView style={styles.multyTabContainer}>

            {/* User Selection for Multy */}
            <TouchableOpacity style={styles.multyUserSelectorContainer} onPress={openUserListModal}>
                <View style={styles.multyUserButton}>
                    <MaterialIcons name="add" size={24} color="grey" />
                </View>
                <Text style={styles.multyAllUsersText}>
                    {selectedUsersMulty.length > 0
                        ? selectedUsersMulty.map(user => user.name).join(', ')
                        : 'Всі користувачі'}
                </Text>
            </TouchableOpacity>



            {/* User List Modal with Checkboxes for Multy */}
            <Modal
                visible={isUserListModalVisible}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <FlatList
                            data={userList}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.modalUserItem}>
                                    <TouchableOpacity
                                        style={styles.modalUserItemRadioArea}
                                        onPress={() => handleUserSelectionChangeMulty(item, isUserParticipant(item), !isUserReceiver(item))}
                                    >
                                        <MaterialIcons
                                            name={isUserReceiver(item) ? "radio-button-checked" : "radio-button-unchecked"}
                                            size={24}
                                            color={isUserReceiver(item) ? "blue" : "grey"}
                                        />
                                    </TouchableOpacity>
                                    <Text style={styles.modalUserName}>{item.name}</Text>
                                    <TouchableOpacity
                                        style={styles.modalUserItemCheckboxArea}
                                        onPress={() => handleUserSelectionChangeMulty(item, !isUserParticipant(item), isUserReceiver(item))}
                                    >
                                        <MaterialIcons
                                            name={isUserParticipant(item) ? "check-box" : "check-box-outline-blank"}
                                            size={24}
                                            color={isUserParticipant(item) ? "green" : "grey"}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        <TouchableOpacity style={styles.modalCloseButton} onPress={closeUserListModal}>
                            <Text style={styles.modalCloseButtonText}>ОК</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>


            {/* Total Row for Multy */}
            <View style={styles.multyTotalRow}>
                <TouchableOpacity 
                    style={styles.multyTotalHeader} 
                    onPress={toggleTotalDropdown}
                >
                    <View style={styles.multyTotalLabelContainer}>
                        <Text style={styles.multyTotalLabelText}>TOTAL</Text>
                        <MaterialIcons 
                            name={isTotalDropdownOpen ? "arrow-drop-up" : "arrow-drop-down"} 
                            size={20} 
                            color="grey" 
                        />
                    </View>
                    <View style={styles.summaryDebtContainer}>
                        <Text style={styles.multySummaryText}>Загальна сума: {calculateTotalMulty().toFixed(2)}</Text>
                        {selectedUsersMulty.length > 0 && (
                            <Text style={styles.multyDebtText}>Поділ: {perUserShare.toFixed(2)} на кожного</Text>
                        )}
                    </View>
                </TouchableOpacity>
                <ScrollView nestedScrollEnabled={true} style={{maxHeight: 300}}>
                    {/* Додаємо кнопку, якщо totalItemsMulty.length === 0 */}
                    {isTotalDropdownOpen && totalItemsMulty.length === 0 && (
                        <TouchableOpacity 
                            style={styles.addFirstItemButton}
                            onPress={handleAddTotalItem}
                        >
                            <MaterialIcons name="add" size={24} color="grey" />
                            <Text style={styles.addFirstItemText}>Додати спільний борг</Text>
                        </TouchableOpacity>
                    )}
                    {isTotalDropdownOpen && totalItemsMulty.map((item, index) => (
                        <DebtItemComponent
                            ref={index === totalItemsMulty.length - 1 ? lastItemRef : null}
                            key={item.id}
                            id={item.id}
                            text={item.text}
                            num={item.num.toString()}
                            onTextChange={(text) => updateDebtItemMultyTotal(index, 'text', text)}
                            onNumChange={(num) => updateDebtItemMultyTotal(index, 'num', num)}
                            onDelete={() => deleteTotalItemMulty(index)}
                            isLast={index === totalItemsMulty.length - 1}
                            isOnly={false} // <-- дозволяє видаляти всі поля
                            onAdd={handleAddTotalItem}
                        />
                    ))}
                </ScrollView>
            </View>


            {/* User Rows for Multy */}
            {selectedUsersMulty.map((user) => (
                <View key={user.id} style={styles.multyUserSection}>
                    <TouchableOpacity 
                        style={styles.multyUserRowHeader} 
                        onPress={() => {
                            toggleUserDropdown(user.id);
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.multyUserNameText}>{user.name}</Text>
                            <MaterialIcons 
                                name={userDropdownOpen[user.id] ? "arrow-drop-up" : "arrow-drop-down"} 
                                size={20} 
                                color="grey" 
                            />
                        </View>
                        <View style={styles.summaryDebtContainer}>
                            <Text style={styles.multySummaryText}>Загальна сума: {calculateSummaryForUser(user.id)}</Text>
                            <Text style={styles.multyDebtText}>Борг до {debtReceiverUser?.name || '...'} : {calculateDebtForUser(user)}</Text>
                        </View>
                    </TouchableOpacity>
                    {userDropdownOpen[user.id] && (
                        <ScrollView nestedScrollEnabled={true} style={{maxHeight: 300}}>
                            {/* Кнопка додавання, якщо немає елементів */}
                            {(!userItemsMulty[user.id] || userItemsMulty[user.id].length === 0) ? (
                                <TouchableOpacity 
                                    style={styles.addFirstItemButton}
                                    onPress={() => handleAddUserItem(user.id)}
                                >
                                    <MaterialIcons name="add" size={24} color="grey" />
                                    <Text style={styles.addFirstItemText}>Додати персональний борг</Text>
                                </TouchableOpacity>
                            ) : (
                                (userItemsMulty[user.id] || []).map((item, index) => (
                                    <DebtItemComponent
                                        ref={index === (userItemsMulty[user.id] || []).length - 1 ? lastItemRef : null}
                                        key={item.id}
                                        id={item.id}
                                        text={item.text}
                                        num={item.num.toString()}
                                        onTextChange={(text) => updateUserItemMulty(user.id, index, 'text', text)}
                                        onNumChange={(num) => updateUserItemMulty(user.id, index, 'num', num)}
                                        onDelete={() => deleteUserItemMulty(user.id, index)}
                                        isLast={index === (userItemsMulty[user.id] || []).length - 1}
                                        isOnly={false}
                                        onAdd={() => handleAddUserItem(user.id)}
                                    />
                                ))
                            )}
                        </ScrollView>
                    )}
                </View>
            ))

        }
            {/* Bottom Add Debt Button for Multy */}
            <TouchableOpacity
                style={[styles.createButton, styles.multyCreateButton]}
                onPress={handleCreateDebtMulty}
            >
                <Text style={styles.createButtonText}>Додати борг</Text>
            </TouchableOpacity>

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
                    totalAmount: calculateTotalMulty(),
                    itemsCount: totalItemsMulty.length + 
                        Object.values(userItemsMulty).reduce((acc, items) => acc + items.length, 0)
                } : null}
                isSuccess={isSuccess}
            />

            {error && (
                <Animated.View style={[
                    styles.errorContainer,
                    { opacity: fadeAnim }
                ]}>
                    <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    multyTabContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    multyUserSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    multyUserButton: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 15,
        marginRight: 10,
        minWidth: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    multyAllUsersText: {
        fontSize: 16,
        fontWeight: 'bold',
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalUserItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalUserItemCheckboxArea: {
        marginLeft: 15,
    },
    modalUserItemRadioArea: {
        marginRight: 15,
    },
    modalUserName: {
        fontSize: 16,
        flex: 1,
    },
    modalCloseButton: {
        padding: 10,
        backgroundColor: '#000',
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 15,
    },
    modalCloseButtonText: {
        color: 'white',
        fontSize: 16,
    },
    multyTotalHeader: {
        marginBottom: 10,
    },
    createButton: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'MontserratBold',
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E53935',
    },
    errorText: {
        color: '#E53935',
        fontSize: 14,
        fontFamily: 'Montserrat',
        textAlign: 'center',
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
    addFirstItemText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
        fontFamily: 'Montserrat',
    },
});

export default MultyTab;