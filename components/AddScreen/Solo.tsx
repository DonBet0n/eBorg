import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, Modal, Vibration, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DebtItemComponent from '../DebtItem';
import { User, DebtItem, Debt } from '../../types/debt';
import { useFirebase } from '../../contexts/FirebaseContext';
import { addDoc, collection } from 'firebase/firestore';
import ConfirmDebtModal from './ConfirmDebtModal';

interface SoloTabProps {
    userList: User[];
}

const SoloTab: React.FC<SoloTabProps> = ({ userList }) => {
    const { db } = useFirebase();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    const [debtItemsSolo, setDebtItemsSolo] = useState<DebtItem[]>([{ id: '1', text: '', num: '0' }]);
    const [selectedUserSolo1, setSelectedUserSolo1] = useState<User | null>(null);
    const [selectedUserSolo2, setSelectedUserSolo2] = useState<User | null>(null);
    const [currentUserSelectorSolo, setCurrentUserSelectorSolo] = useState<'user1' | 'user2' | null>(null);
    const lastItemRef = useRef<{ focusDescription: () => void }>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

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

            const debtPromises = debtItemsSolo
                .filter(item => item.num)
                .map(item => {
                    const debt = {
                        deptId: deptId,
                        fromUserId: selectedUserSolo1?.id || '',  // Add null check
                        toUserId: selectedUserSolo2?.id || '',    // Add null check
                        text: item.text?.trim() || 'Без опису',
                        amount: Number(Number(item.num).toFixed(2)),
                        createdAt: new Date(),
                    };

                    return addDoc(collection(db, 'debts'), debt);
                });

            await Promise.all(debtPromises);
            console.log('Створено борги з group ID:', deptId);
            
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
                        num={item.num.toString()}
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

            <ConfirmDebtModal
                visible={confirmModalVisible}
                onClose={() => {
                    setConfirmModalVisible(false);
                    setIsSuccess(false);
                }}
                onConfirm={confirmDebtCreation}
                debtInfo={selectedUserSolo1 && selectedUserSolo2 ? {
                    fromUser: selectedUserSolo1.name,
                    toUser: selectedUserSolo2.name,
                    totalAmount: calculateTotalSolo(),
                    itemsCount: debtItemsSolo.length
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
});

export default SoloTab;