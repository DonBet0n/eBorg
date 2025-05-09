import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppwrite } from '../../contexts/AppwriteContext';
import { APPWRITE } from '../../contexts/AppwriteContext';
import * as ImagePicker from 'expo-image-picker';
import { ID } from 'react-native-appwrite';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
    const { user, databases, storage, getCurrentUser, account, setUser } = useAppwrite();
    const [name, setName] = useState('');
    const [secondName, setSecondName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setSecondName(user.secondName || '');
            if (user.avatar) {
                const avatarUrl = storage.getFileView(APPWRITE.storage.avatars, user.avatar).href;
                setAvatarUri(avatarUrl);
            }
        }
    }, [user]);

    const handleSave = async () => {
        if (!user || !name.trim()) return;
        
        setIsLoading(true);
        try {
            await databases.updateDocument(
                APPWRITE.databases.main,
                APPWRITE.databases.collections.users,
                user.id,
                {
                    name: name.trim(),
                    secondName: secondName.trim(),
                }
            );
            await getCurrentUser();
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
            await AsyncStorage.clear(); // Очищаємо весь кеш
            setUser(null);
            onClose();
            router.replace('/');
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Помилка', 'Не вдалося вийти з системи. Спробуйте ще раз.');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Профіль</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarContainer}>
                            {avatarUri ? (
                                <Image 
                                    source={{ uri: avatarUri }} 
                                    style={styles.avatarImage} 
                                />
                            ) : (
                                <MaterialIcons name="account-circle" size={80} color="black" />
                            )}
                            <View style={styles.editIconContainer}>
                                <MaterialIcons name="edit" size={20} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Ім'я</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Введіть ваше ім'я"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={styles.inputLabel}>Прізвище</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="Введіть ваше прізвище"
                            placeholderTextColor="#666"
                            value={secondName}
                            onChangeText={setSecondName}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        <Text style={styles.saveButtonText}>
                            {isLoading ? 'Збереження...' : 'Зберегти зміни'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Text style={styles.logoutButtonText}>Вийти з акаунту</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'MontserratBold',
    },
    closeButton: {
        padding: 8,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    editIconContainer: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        borderRadius: 12,
        padding: 4,
    },
    inputSection: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        color: '#666',
        marginVertical: 8,
        fontFamily: 'Montserrat',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        fontFamily: 'Montserrat',
    },
    emailText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        fontFamily: 'Montserrat',
    },
    saveButton: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 24,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'MontserratBold',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    logoutButton: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#ff3b30',
    },
    logoutButtonText: {
        color: '#ff3b30',
        fontSize: 16,
        fontFamily: 'MontserratBold',
    },
});

export default ProfileModal;
