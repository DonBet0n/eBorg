import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFirebase } from '../../contexts/FirebaseContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppTheme } from '../../contexts/ThemeContext';

const AVATAR_SIZE = 256;

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
    const { user, db, getCurrentUser, setUser, auth } = useFirebase();
    const { colors } = useAppTheme();
    const [name, setName] = useState('');
    const [secondName, setSecondName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setSecondName(user.secondName || '');
            if (user.avatar) {
                setAvatarUri(user.avatar); // Якщо avatar - це url
            } else {
                setAvatarUri(null);
            }
        }
    }, [user]);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // Аватар зберігається base64 прямо в документі користувача і синхронізується на всі пристрої,
                // тому зменшуємо його до маленького JPEG (~15–25 КБ замість сотень КБ)
                const resized = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );
                if (resized.base64) {
                    setAvatarUri(`data:image/jpeg;base64,${resized.base64}`);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Помилка', 'Не вдалося завантажити зображення');
        }
    };

    const handleSave = async () => {
        if (!user || !name.trim()) return;
        setIsLoading(true);
        try {
            await db().collection('users').doc(user.id).update({
                name: name.trim(),
                secondName: secondName.trim(),
                ...(avatarUri ? { avatar: avatarUri } : {}),
                updatedAt: db.FieldValue.serverTimestamp(),
            });
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
            await auth().signOut();
            await AsyncStorage.clear();
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
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Профіль</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color={colors.icon} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                            {avatarUri ? (
                                <Image 
                                    source={{ uri: avatarUri }} 
                                    style={styles.avatarImage} 
                                />
                            ) : (
                                <MaterialIcons name="account-circle" size={80} color={colors.icon} />
                            )}
                            <View style={styles.editIconContainer}>
                                <MaterialIcons name="edit" size={20} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ім'я</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="Введіть ваше ім'я"
                            placeholderTextColor={colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Прізвище</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="Введіть ваше прізвище"
                            placeholderTextColor={colors.textSecondary}
                            value={secondName}
                            onChangeText={setSecondName}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveButton, { backgroundColor: colors.buttonBg }, isLoading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>
                            {isLoading ? 'Збереження...' : 'Зберегти зміни'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.logoutButton, { backgroundColor: colors.background, borderColor: colors.negativeBg }]}
                        onPress={handleLogout}
                    >
                        <Text style={[styles.logoutButtonText, { color: colors.negativeText }]}>Вийти з акаунту</Text>
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
