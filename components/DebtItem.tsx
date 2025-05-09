import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface DebtItemComponentProps {
    id: string;  // Add id prop
    text: string;
    num: string; // змінюємо тип з number на string
    onTextChange: (text: string) => void;
    onNumChange: (num: string) => void;
    onDelete: () => void;
    isLast: boolean;
    isOnly: boolean;
    onAdd: () => void;
}

const DebtItemComponent = forwardRef<{focusDescription: () => void}, DebtItemComponentProps>(({
    text, 
    num, 
    onTextChange, 
    onNumChange, 
    onDelete,
    isLast,
    isOnly,
    onAdd 
}, ref) => {
    const descriptionInputRef = useRef<TextInput>(null);
    const amountInputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
        focusDescription: () => {
            descriptionInputRef.current?.focus();
        }
    }));

    const handleDescriptionSubmit = () => {
        amountInputRef.current?.focus();
    };

    const handleAmountSubmit = () => {
        if (isLast) {
            onAdd();
        }
    };

    return (
        <View>
            <View style={styles.debtItemContainer}>
                <TextInput
                    ref={descriptionInputRef}
                    style={styles.debtItemTextInput}
                    value={text}
                    placeholder="Опис боргу"
                    onChangeText={onTextChange}
                    onSubmitEditing={handleDescriptionSubmit}
                />
                <TextInput
                    ref={amountInputRef}
                    style={styles.debtItemNumberInput}
                    value={num === '0' ? '' : num}
                    placeholder="Сума"
                    keyboardType="numeric"
                    onChangeText={onNumChange}
                    onSubmitEditing={handleAmountSubmit}
                    selection={num === '0' ? { start: 0, end: 0 } : undefined}
                />
                <TouchableOpacity 
                    onPress={onDelete} 
                    style={[styles.deleteButton, isOnly && styles.deleteButtonDisabled]}
                    disabled={isOnly}
                >
                    <MaterialIcons 
                        name="delete" 
                        size={20} 
                        color={isOnly ? '#ccc' : 'black'} 
                    />
                </TouchableOpacity>
            </View>
            {isLast && (
                <TouchableOpacity onPress={onAdd} style={styles.addButton}>
                    <MaterialIcons name="add" size={24} color="#666" />
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    debtItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        //paddingBottom: 8,
    },
    debtItemTextInput: {
        flex: 1,
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        fontFamily: 'Montserrat',
    },
    debtItemNumberInput: {
        width: 80,
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        textAlign: 'center',
        fontFamily: 'Montserrat',
    },
    deleteButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    deleteButtonDisabled: {
        opacity: 0.5,
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

export default DebtItemComponent;