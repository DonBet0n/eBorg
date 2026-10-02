import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { User } from '../../types/debt';
import AddScreenStyles from '../../styles/AddScreenStyles';
import { useAppTheme } from '../../contexts/ThemeContext';

interface UserSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    userList: User[];
    
    // Mode
    mode: 'solo' | 'multy' | 'split';
    
    // For Solo
    selectedUserId?: string;
    onSelectSolo?: (user: User) => void;
    
    receiverId?: string;
    isUserParticipant?: (user: User) => boolean;
    onSelectMulty?: (user: User, isParticipant: boolean, isReceiver: boolean) => void;

    // For Split
    isUserSplitSelected?: (user: User) => boolean;
    onSelectSplit?: (user: User) => void;
}

const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
    visible,
    onClose,
    userList,
    mode,
    selectedUserId,
    onSelectSolo,
    receiverId,
    isUserParticipant,
    onSelectMulty,
    isUserSplitSelected,
    onSelectSplit
}) => {
    const { colors } = useAppTheme();

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={AddScreenStyles.modalOverlay}>
                <View style={[AddScreenStyles.modalContent, { backgroundColor: colors.background }]}>
                    <FlatList
                        data={userList}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            if (mode === 'solo' && onSelectSolo) {
                                const isSelected = selectedUserId === item.id;
                                return (
                                    <TouchableOpacity onPress={() => onSelectSolo(item)}>
                                        <View style={[AddScreenStyles.modalUserItem, { borderBottomColor: colors.border }]}>
                                            <View style={AddScreenStyles.modalUserItemRadioArea}>
                                                <MaterialIcons
                                                    name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
                                                    size={24}
                                                    color={isSelected ? colors.text : colors.iconSecondary}
                                                />
                                            </View>
                                            <Text style={[AddScreenStyles.modalUserName, { color: colors.text }]}>{item.name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            } else if (mode === 'multy' && onSelectMulty && isUserParticipant) {
                                const isReceiver = receiverId === item.id;
                                const isParticipant = isUserParticipant(item);
                                
                                return (
                                    <View style={[AddScreenStyles.modalUserItem, { borderBottomColor: colors.border }]}>
                                        <TouchableOpacity
                                            style={AddScreenStyles.modalUserItemRadioArea}
                                            onPress={() => onSelectMulty(item, isParticipant, !isReceiver)}
                                        >
                                            <MaterialIcons
                                                name={isReceiver ? "radio-button-checked" : "radio-button-unchecked"}
                                                size={24}
                                                color={isReceiver ? colors.text : colors.iconSecondary}
                                            />
                                        </TouchableOpacity>
                                        <Text style={[AddScreenStyles.modalUserName, { color: colors.text }]}>{item.name}</Text>
                                        <TouchableOpacity
                                            style={AddScreenStyles.modalUserItemCheckboxArea}
                                            onPress={() => onSelectMulty(item, !isParticipant, isReceiver)}
                                        >
                                            <MaterialIcons
                                                name={isParticipant ? "check-box" : "check-box-outline-blank"}
                                                size={24}
                                                color={isParticipant ? colors.positiveText : colors.iconSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            } else if (mode === 'split' && onSelectSplit && isUserSplitSelected) {
                                const isSelected = isUserSplitSelected(item);
                                return (
                                    <View style={[AddScreenStyles.modalUserItem, { borderBottomColor: colors.border }]}>
                                        <Text style={[AddScreenStyles.modalUserName, { color: colors.text }]}>{item.name}</Text>
                                        <TouchableOpacity
                                            style={AddScreenStyles.modalUserItemCheckboxArea}
                                            onPress={() => onSelectSplit(item)}
                                        >
                                            <MaterialIcons
                                                name={isSelected ? "check-box" : "check-box-outline-blank"}
                                                size={24}
                                                color={isSelected ? colors.positiveText : colors.iconSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            }
                            return null;
                        }}
                    />
                    <TouchableOpacity style={[AddScreenStyles.modalCloseButton, { backgroundColor: colors.buttonBg }]} onPress={onClose}>
                        <Text style={[AddScreenStyles.modalCloseButtonText, { color: colors.buttonText }]}>ОК</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default UserSelectionModal;
