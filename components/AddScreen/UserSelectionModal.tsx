import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import { User } from '../../types/debt';
import { useAppTheme } from '../../contexts/ThemeContext';
import BottomSheet from '../ui/BottomSheet';
import { displayName } from './FormParts';
import { appStyles } from '@/utils/appStyles';
import { BUTTON } from '@/constants/Theme';

interface UserSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    // Питання, на яке відповідає вибір: «Хто винен», «Хто платив», «Учасники»
    title: string;
    userList: User[];
    // Поточний користувач іде першим у списку з позначкою «Ви»
    currentUserId?: string;
    // Кілька людей (прапорці, вікно закривається кнопкою) чи одна (вибір одразу закриває вікно)
    multiple?: boolean;
    isSelected: (user: User) => boolean;
    onSelect: (user: User) => void;
    // Коротка позначка під іменем, наприклад «платник»
    getTag?: (user: User) => string | undefined;
}

const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
    visible,
    onClose,
    title,
    userList,
    currentUserId,
    multiple,
    isSelected,
    onSelect,
    getTag,
}) => {
    const { colors, textScale } = useAppTheme();

    const sortedUsers = useMemo(() => {
        const me = userList.find(user => user.id === currentUserId);
        return me ? [me, ...userList.filter(user => user.id !== currentUserId)] : userList;
    }, [userList, currentUserId]);

    const selectedCount = multiple ? sortedUsers.filter(isSelected).length : 0;
    const divider = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border };

    return (
        <BottomSheet visible={visible} onClose={onClose} title={title}>
            {sortedUsers.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
                    Список людей ще не завантажився. Перевірте з&apos;єднання і спробуйте ще раз.
                </Text>
            ) : (
                <FlatList
                    data={sortedUsers}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    // Вибір живе поза списком, тому просимо перемалювати рядки, коли він змінюється
                    extraData={isSelected}
                    renderItem={({ item, index }) => {
                        const selected = isSelected(item);
                        const tags = [item.id === currentUserId ? 'Ви' : undefined, getTag?.(item)].filter(Boolean).join(' · ');
                        const icon = multiple
                            ? (selected ? 'check-box' : 'check-box-outline-blank')
                            : (selected ? 'radio-button-checked' : 'radio-button-unchecked');

                        return (
                            <TouchableOpacity
                                style={[styles.row, index > 0 && divider]}
                                onPress={() => onSelect(item)}
                                accessibilityRole={multiple ? 'checkbox' : 'radio'}
                                accessibilityState={{ checked: selected }}
                                accessibilityLabel={tags ? `${displayName(item)}, ${tags}` : displayName(item)}
                            >
                                <Avatar uri={item.avatar} name={item.name} size={40} />
                                <View style={styles.rowText}>
                                    <Text style={[styles.name, { color: colors.text, fontSize: 16 * textScale }]} numberOfLines={1}>
                                        {displayName(item)}
                                    </Text>
                                    {!!tags && (
                                        <Text style={[styles.tags, { color: colors.textSecondary, fontSize: 14 * textScale }]} numberOfLines={1}>
                                            {tags}
                                        </Text>
                                    )}
                                </View>
                                <Icon name={icon} size={24} color={selected ? colors.text : colors.iconSecondary} />
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {multiple && (
                <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.buttonBg }]} onPress={onClose} accessibilityRole="button">
                    <Text style={[styles.doneButtonText, { color: colors.buttonText, fontSize: 16 * textScale }]}>
                        {selectedCount > 0 ? `Готово · ${selectedCount}` : 'Готово'}
                    </Text>
                </TouchableOpacity>
            )}
        </BottomSheet>
    );
};

const styles = appStyles({
    empty: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        textAlign: 'center',
        paddingVertical: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        paddingVertical: 12,
    },
    rowText: {
        flex: 1,
    },
    name: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    tags: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginTop: 2,
    },
    doneButton: {
        minHeight: BUTTON.height,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BUTTON.radius,
        marginTop: 16,
    },
    doneButtonText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
});

export default UserSelectionModal;
