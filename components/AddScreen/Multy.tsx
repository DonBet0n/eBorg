import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DebtItemComponent from '../../components/DebtItem';
import { User, DebtItem } from '../../types/debt';
import { useAppwrite, APPWRITE } from '../../contexts/AppwriteContext';
import { ID } from 'react-native-appwrite';

interface MultyTabProps {
    userList: User[];
}

const MultyTab: React.FC<MultyTabProps> = ({ userList }) => {
    const { databases } = useAppwrite();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    const [selectedUsersMulty, setSelectedUsersMulty] = useState<User[]>([]);
    const [totalItemsMulty, setTotalItemsMulty] = useState<DebtItem[]>([{ id: 'totalItem1', text: '', num: '0' }]);
    const [userItemsMulty, setUserItemsMulty] = useState<{ [userId: string]: DebtItem[] }>({});
    const [isTotalDropdownOpen, setTotalDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState<{ [key: string]: boolean }>({});
    const [debtReceiverUser, setDebtReceiverUser] = useState<User | null>(null);
    const inputRefs = useRef<{ [key: string]: TextInput | null }>({});

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
        setTotalItemsMulty(prevItems => prevItems.length <= 1 ? prevItems : prevItems.filter((_, i) => i !== index));
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

    const handleCreateDebtMulty = useCallback(async () => {
        if (!debtReceiverUser || selectedUsersMulty.length === 0) return;
        
        const deptId = ID.unique();
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

                        const documentId = ID.unique();
                        const sharedDebt = {
                            deptId: deptId,
                            fromUserId: user.id,
                            toUserId: debtReceiverUser.id,
                            text: totalItem.text?.trim() 
                                ? `${totalItem.text} (спільні витрати)` 
                                : 'Без опису (спільні витрати)',
                            amount: perUserShare,
                            createdAt: new Date().toISOString(),
                        };

                        debtPromises.push(
                            databases.createDocument(
                                APPWRITE.databases.main,
                                APPWRITE.databases.collections.debts,
                                documentId,
                                sharedDebt
                            )
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
                        const documentId = ID.unique();
                        const personalDebt = {
                            deptId: deptId,
                            fromUserId: user.id,
                            toUserId: debtReceiverUser.id,
                            text: item.text?.trim() || 'Без опису',
                            amount: Number(Number(item.num).toFixed(2)),
                            createdAt: new Date().toISOString(),
                        };

                        debtPromises.push(
                            databases.createDocument(
                                APPWRITE.databases.main,
                                APPWRITE.databases.collections.debts,
                                documentId,
                                personalDebt
                            )
                        );
                    }
                });
            });

            await Promise.all(debtPromises);
            console.log('Створено групові борги з ID:', deptId);

            // Reset form
            setTotalItemsMulty([{ id: 'totalItem1', text: '', num: '0' }]);
            setUserItemsMulty({});
            setSelectedUsersMulty([]);
            setDebtReceiverUser(null);

        } catch (error) {
            console.error('Error creating multy debts:', error);
        }
    }, [debtReceiverUser, selectedUsersMulty, totalItemsMulty, userItemsMulty, databases]);

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
                            isOnly={totalItemsMulty.length === 1}
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
                            // Ініціалізуємо масив боргів для користувача, якщо його ще немає
                            if (!userItemsMulty[user.id]) {
                                setUserItemsMulty(prev => ({
                                    ...prev,
                                    [user.id]: [{ id: String(Date.now()), text: '', num: '0' }]
                                }));
                            }
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
                            {(userItemsMulty[user.id] || []).map((item, index) => (
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
                                    isOnly={(userItemsMulty[user.id] || []).length === 1}
                                    onAdd={() => handleAddUserItem(user.id)}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            ))}


            {/* Bottom Add Debt Button for Multy */}
            <TouchableOpacity
                style={[styles.createButton, styles.multyCreateButton]}
                onPress={handleCreateDebtMulty}
            >
                <Text style={styles.createButtonText}>Додати борг</Text>
            </TouchableOpacity>
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
});

export default MultyTab;