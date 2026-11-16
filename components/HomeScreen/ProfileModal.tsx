import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import { useFirebase } from '../../contexts/FirebaseContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';

import { useAppTheme } from '../../contexts/ThemeContext';
import BottomSheet from '../ui/BottomSheet';

const AVATAR_SIZE = 256;

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

// Одна форма: фото змінюється одразу (як у месенджерах), ім'я та прізвище редагуються на місці
// і зберігаються кнопкою, яка активна лише коли є зміни
const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
    const { user, db, getCurrentUser, setUser, auth } = useFirebase();
    const { colors, isDark } = useAppTheme();
    const [name, setName] = useState('');
    const [secondName, setSecondName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);
    const [focusedField, setFocusedField] = useState<'name' | 'secondName' | null>(null);

    // Кожне відкриття показує збережені дані; незбережені правки відкидаються
    useEffect(() => {
        if (visible) {
            setName(user?.name || '');
            setSecondName(user?.secondName || '');
        }
    }, [visible, user?.name, user?.secondName]);

    const updateUser = async (fields: Record<string, unknown>) => {
        if (!user) return;
        await db().collection('users').doc(user.id).update({
            ...fields,
            updatedAt: db.FieldValue.serverTimestamp(),
        });
        await getCurrentUser();
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (result.canceled || !result.assets?.length) return;

            setIsAvatarUpdating(true);
            // Аватар зберігається base64 прямо в документі користувача і синхронізується на всі пристрої,
            // тому зменшуємо його до маленького JPEG (~15–25 КБ замість сотень КБ)
            const resized = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            if (resized.base64) {
                await updateUser({ avatar: `data:image/jpeg;base64,${resized.base64}` });
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            Alert.alert('Помилка', 'Не вдалося оновити фото. Спробуйте ще раз.');
        } finally {
            setIsAvatarUpdating(false);
        }
    };

    const removeAvatar = async () => {
        setIsAvatarUpdating(true);
        try {
            await updateUser({ avatar: db.FieldValue.delete() });
        } catch (error) {
            console.error('Error removing avatar:', error);
            Alert.alert('Помилка', 'Не вдалося видалити фото. Спробуйте ще раз.');
        } finally {
            setIsAvatarUpdating(false);
        }
    };

    const handleAvatarPress = () => {
        if (isAvatarUpdating) return;
        if (!user?.avatar) {
            pickImage();
            return;
        }
        Alert.alert('Фото профілю', undefined, [
            { text: 'Вибрати нове фото', onPress: pickImage },
            { text: 'Видалити фото', style: 'destructive', onPress: removeAvatar },
            { text: 'Скасувати', style: 'cancel' },
        ]);
    };

    const isNameEmpty = name.trim().length === 0;
    const isDirty = name.trim() !== (user?.name || '') || secondName.trim() !== (user?.secondName || '');
    const canSave = !isSaving && !isNameEmpty && isDirty;

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            await updateUser({ name: name.trim(), secondName: secondName.trim() });
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Помилка', 'Не вдалося оновити профіль. Спробуйте ще раз.');
        } finally {
            setIsSaving(false);
        }
    };

    const logout = async () => {
        try {
            await auth().signOut();
            setUser(null);
            onClose();
            router.replace('/');
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Помилка', 'Не вдалося вийти з системи. Спробуйте ще раз.');
        }
    };

    const handleLogout = () => {
        Alert.alert('Вийти з акаунту?', 'Щоб знову побачити свої борги, потрібно буде увійти ще раз.', [
            { text: 'Скасувати', style: 'cancel' },
            { text: 'Вийти', style: 'destructive', onPress: logout },
        ]);
    };

    const surface = isDark ? colors.card : colors.cardAlt;
    // Поле у фокусі обводиться основним кольором, порожнє ім'я — червоним
    const fieldBorder = (field: 'name' | 'secondName', invalid = false) =>
        invalid ? colors.negativeText : focusedField === field ? colors.text : 'transparent';

    return (
        <BottomSheet visible={visible} onClose={onClose} title="Профіль">
            {/* Прокрутка стискається, коли шторка піднімається над клавіатурою, і докручує до поля у фокусі */}
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.avatarBlock}>
                    <TouchableOpacity
                        onPress={handleAvatarPress}
                        disabled={isAvatarUpdating}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={user?.avatar ? 'Змінити фото профілю' : 'Додати фото профілю'}
                    >
                        <View style={[styles.avatarRing, { borderColor: surface }]}>
                            <Avatar uri={user?.avatar} name={user?.name} size={96} />
                            {isAvatarUpdating && (
                                <View style={styles.avatarOverlay}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            )}
                        </View>
                        <View style={[styles.cameraBadge, { backgroundColor: colors.text, borderColor: colors.background }]}>
                            <Icon name="photo-camera" size={15} color={colors.background} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAvatarPress} disabled={isAvatarUpdating} hitSlop={8} accessibilityRole="button">
                        <Text style={[styles.avatarAction, { color: colors.text }]}>
                            {user?.avatar ? 'Змінити фото' : 'Додати фото'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>Пошта</Text>
                <View style={[styles.field, styles.readonlyField, { backgroundColor: surface }]}>
                    <Text style={[styles.fieldText, { color: colors.text }]} numberOfLines={1}>{user?.email || '—'}</Text>
                    <Icon name="check" size={18} color={colors.positiveText} />
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>Ім'я</Text>
                <TextInput
                    style={[styles.field, styles.input, { backgroundColor: surface, color: colors.text, borderColor: fieldBorder('name', isNameEmpty) }]}
                    placeholder="Введіть ваше ім'я"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    returnKeyType="next"
                    accessibilityLabel="Ім'я"
                />
                {isNameEmpty && (
                    <Text style={[styles.errorText, { color: colors.negativeText }]}>Ім'я не може бути порожнім</Text>
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>Прізвище</Text>
                <TextInput
                    style={[styles.field, styles.input, { backgroundColor: surface, color: colors.text, borderColor: fieldBorder('secondName') }]}
                    placeholder="Необов'язково"
                    placeholderTextColor={colors.textSecondary}
                    value={secondName}
                    onChangeText={setSecondName}
                    onFocus={() => setFocusedField('secondName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                    accessibilityLabel="Прізвище"
                />

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.text }, !canSave && styles.disabled]}
                    onPress={handleSave}
                    disabled={!canSave}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSave, busy: isSaving }}
                >
                    {isSaving ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={[styles.saveText, { color: colors.background }]}>Зберегти зміни</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} accessibilityRole="button">
                    <Icon name="logout" size={18} color={colors.negativeText} />
                    <Text style={[styles.logoutText, { color: colors.negativeText }]}>Вийти з акаунту</Text>
                </TouchableOpacity>
            </ScrollView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    scroll: {
        flexShrink: 1,
    },
    avatarBlock: {
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    // Кільце навколо фото відділяє його від фону шторки
    avatarRing: {
        borderWidth: 6,
        borderRadius: 54,
    },
    avatarOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        right: 2,
        bottom: 2,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarAction: {
        fontSize: 14,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    label: {
        fontSize: 13,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 4,
    },
    field: {
        borderRadius: 18,
        paddingHorizontal: 18,
    },
    readonlyField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 54,
    },
    fieldText: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    // Висота поля з вертикальних відступів, а не з minHeight і центрування: Android зсуває вікно над
    // клавіатурою до нижнього краю відступу, тож так поле видно повністю, а не до середини
    input: {
        paddingVertical: 15,
        includeFontPadding: false,
        borderWidth: 1.5,
        fontSize: 16,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    errorText: {
        fontSize: 13,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginTop: 6,
        marginLeft: 4,
    },
    saveButton: {
        minHeight: 54,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 28,
    },
    saveText: {
        fontSize: 16,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    disabled: {
        opacity: 0.35,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        marginTop: 8,
    },
    logoutText: {
        fontSize: 15,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
});

export default ProfileModal;
