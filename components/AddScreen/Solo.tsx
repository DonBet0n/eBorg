import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, Modal, Vibration } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DebtItemComponent from '../DebtItem';
import { User, DebtItem, Debt } from '../../types/debt';
import { useAppwrite, APPWRITE } from '../../contexts/AppwriteContext';
import { ID } from 'react-native-appwrite';

interface SoloTabProps {
    userList: User[];
}

const SoloTab: React.FC<SoloTabProps> = ({ userList }) => {
    const { databases } = useAppwrite();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    const [debtItemsSolo, setDebtItemsSolo] = useState<DebtItem[]>([{ id: '1', text: '', num: 0 }]);
    const [selectedUserSolo1, setSelectedUserSolo1] = useState<User | null>(null);
    const [selectedUserSolo2, setSelectedUserSolo2] = useState<User | null>(null);
    const [currentUserSelectorSolo, setCurrentUserSelectorSolo] = useState<'user1' | 'user2' | null>(null);
    const lastItemRef = useRef<{ focusDescription: () => void }>(null);

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
        return debtItemsSolo.reduce((sum, item) => sum + Number(item.num || 0), 0);
    }, [debtItemsSolo]);

    const addDebtItemSolo = useCallback(() => {
        setDebtItemsSolo(prevItems => [...prevItems, { id: String(Date.now()), text: '', num: 0 }]);
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
                    if (field === 'num') {
                        // If value is empty string, set to 0
                        const numValue = value === '' ? 0 : Number(value) || 0;
                        return { ...item, [field]: numValue };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    }, []);


    const handleCreateDebtSolo = useCallback(async () => {
        if (!selectedUserSolo1 || !selectedUserSolo2) return;

        const deptId = ID.unique();

        try {
            const debtPromises = debtItemsSolo
                .filter(item => item.num) // Прибираємо перевірку на text
                .map(item => {
                    const documentId = ID.unique();
                    const debt = {
                        deptId: deptId,
                        fromUserId: selectedUserSolo1.id,
                        toUserId: selectedUserSolo2.id,
                        text: item.text?.trim() || 'Без опису', // Додаємо значення за замовчуванням
                        amount: Number(Number(item.num).toFixed(2)), // Округлення до 2 знаків
                        createdAt: new Date().toISOString(),
                    };

                    return databases.createDocument(
                        APPWRITE.databases.main,
                        APPWRITE.databases.collections.debts,
                        documentId,
                        debt
                    );
                });

            await Promise.all(debtPromises);
            console.log('Створено борги з group ID:', deptId);
            
            // Reset form after successful creation
            setDebtItemsSolo([{ id: '1', text: '', num: 0 }]);
            setSelectedUserSolo1(null);
            setSelectedUserSolo2(null);

        } catch (error) {
            console.error('Error creating debts:', error);
        }
    }, [debtItemsSolo, selectedUserSolo1, selectedUserSolo2, databases]);

    return (
        <View style={styles.soloTabContainer}>
            {/* Person Selector for Solo */}
            <View style={styles.personSelectorContainer}>
                <TouchableOpacity
                    style={styles.multyUserSelectorContainerSolo}
                    onPress={() => openUserListModalSolo('user1')}
                >
                    <View style={styles.multyUserButton}>
                        {selectedUserSolo1 ? (
                            <Text style={styles.selectedUserName}>{selectedUserSolo1.name}</Text>
                        ) : (
                            <MaterialIcons name="add" size={24} color="grey" />
                        )}
                    </View>
                </TouchableOpacity>

                <MaterialIcons
                    name={"arrow-forward"}
                    size={30}
                    color="black"
                />

                <TouchableOpacity
                    style={styles.multyUserSelectorContainerSolo}
                    onPress={() => openUserListModalSolo('user2')}
                >
                    <View style={styles.multyUserButton}>
                        {selectedUserSolo2 ? (
                            <Text style={styles.selectedUserName}>{selectedUserSolo2.name}</Text>
                        ) : (
                            <MaterialIcons name="add" size={24} color="grey" />
                        )}
                    </View>
                </TouchableOpacity>
            </View>


            {/* User List Modal with Radio buttons for Solo */}
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
                                <TouchableOpacity onPress={() => handleUserSelectionChangeSolo(item)}>
                                    <View style={styles.modalUserItem}>
                                        <View style={styles.modalUserItemRadioArea}>
                                            <MaterialIcons
                                                name={(currentUserSelectorSolo === 'user1' && selectedUserSolo1?.id === item.id) 
                                                    || (currentUserSelectorSolo === 'user2' && selectedUserSolo2?.id === item.id) ? "radio-button-checked" : "radio-button-unchecked"}
                                                size={24}
                                                color={((currentUserSelectorSolo === 'user1' && selectedUserSolo1?.id === item.id) 
                                                    || (currentUserSelectorSolo === 'user2' && selectedUserSolo2?.id === item.id)) ? "blue" : "grey"}
                                            />
                                        </View>
                                        <Text style={styles.modalUserName}>{item.name}</Text>
                                        <View style={styles.modalUserItemCheckboxArea}>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.modalCloseButton} onPress={closeUserListModal}>
                            <Text style={styles.modalCloseButtonText}>ОК</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>


            {/* Debt Items List for Solo */}
            <FlatList
                data={debtItemsSolo}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <DebtItemComponent
                        ref={index === debtItemsSolo.length - 1 ? lastItemRef : null}
                        id={item.id}
                        text={item.text}
                        num={item.num.toString()} // Convert number to string for the component
                        onTextChange={(text) => updateDebtItemSolo(item.id, 'text', text)}
                        onNumChange={(num) => updateDebtItemSolo(item.id, 'num', num)}
                        onDelete={() => deleteDebtItemSolo(item.id)}
                        isLast={index === debtItemsSolo.length - 1}
                        isOnly={debtItemsSolo.length === 1}
                        onAdd={addDebtItemSolo}
                    />
                )}
                style={styles.debtItemList}
            />

            {/* Total with Create Button for Solo */}
            <View style={styles.bottomContainer}>
                <View style={styles.totalContainer}>
                    <Text style={styles.totalText}>Total</Text>
                    <View style={styles.totalValueContainer}>
                        <Text style={styles.totalValue}>{calculateTotalSolo()}</Text>
                        <Text style={styles.currency}> грн</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreateDebtSolo}
                >
                    <Text style={styles.createButtonText}>Створити борг</Text>
                </TouchableOpacity>
            </View>
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
    multyUserSelectorContainerSolo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
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
    selectedUserName: {
        fontSize: 16,
        fontWeight: 'bold',
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

export default SoloTab;