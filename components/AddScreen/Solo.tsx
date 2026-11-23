import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import Icon from '@/components/ui/Icon';
import DebtItemComponent from '../DebtItem';
import { User, DebtItem } from '../../types/debt';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { formatAmount, isValidDebtAmount } from '../../utils/debtCalculations';
import ConfirmDebtModal from './ConfirmDebtModal';
import UserSelectionModal from './UserSelectionModal';
import ErrorToast from '../ui/ErrorToast';
import QRScannerModal from '../QRScannerModal';
import { AddItemButton, ClearFormButton, FormFooter, ItemsHeader, PeopleBar, PersonChip, displayName, formStyles, useFormColors } from './FormParts';
import { appStyles } from '@/utils/appStyles';
import { appAlert } from '@/components/ui/AppDialog';

interface SoloTabProps {
    userList: User[];
    onHasItemsChange?: (hasItems: boolean) => void;
    // Шапка екрана прокручується разом з формою
    header?: React.ReactNode;
}

const EMPTY_ITEM: DebtItem = { id: '1', text: '', num: '0' };

const SoloTab: React.FC<SoloTabProps> = ({ userList, onHasItemsChange, header }) => {
    const { user: currentUser, createDebts, notifyUser } = useFirebase();
    const { colors, currencySymbol } = useAppTheme();
    const { surface } = useFormColors();
    const [isUserListModalVisible, setUserListModalVisible] = useState(false);
    const [debtItemsSolo, setDebtItemsSolo] = useState<DebtItem[]>([EMPTY_ITEM]);
    const [selectedUserSolo1, setSelectedUserSolo1] = useState<User | null>(null);
    const [selectedUserSolo2, setSelectedUserSolo2] = useState<User | null>(null);
    // Для кого відкрито список людей: user1 — хто винен, user2 — кому
    const [currentUserSelectorSolo, setCurrentUserSelectorSolo] = useState<'user1' | 'user2'>('user1');
    const [isScannerVisible, setIsScannerVisible] = useState(false);

    const lastItemRef = useRef<{ focusDescription: () => void }>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);

    const firstItem = debtItemsSolo[0];
    // Порожній початковий рядок за позицію не рахується
    const hasItems = debtItemsSolo.length > 1 ||
                     (!!firstItem && (firstItem.text.trim() !== '' || (firstItem.num !== '0' && firstItem.num !== '')));
    // «Я» у «Хто винен» стоїть за замовчуванням і даними форми не рахується
    const isDefaultPeople = selectedUserSolo2 === null && (selectedUserSolo1 === null || selectedUserSolo1.id === currentUser?.id);
    const hasData = !isDefaultPeople || hasItems;

    // Один з двох майже завжди ви, тож одразу ставимо вас першим, у «Хто винен»; ⇄ міняє напрямок
    const placedMeRef = useRef(false);
    useEffect(() => {
        if (!currentUser || placedMeRef.current) return;
        placedMeRef.current = true;
        setSelectedUserSolo1(prev => prev ?? currentUser);
    }, [currentUser]);

    useEffect(() => {
        onHasItemsChange?.(hasItems);
    }, [hasItems, onHasItemsChange]);

    // --- Вибір людей ---
    const openUserListModalSolo = useCallback((selector: 'user1' | 'user2') => {
        setCurrentUserSelectorSolo(selector);
        setUserListModalVisible(true);
    }, []);

    const closeUserListModal = useCallback(() => {
        setUserListModalVisible(false);
    }, []);

    const handleUserSelectionChangeSolo = useCallback((user: User) => {
        // Якщо цю людину вже обрано з іншого боку, сторони міняються місцями
        if (currentUserSelectorSolo === 'user1') {
            if (selectedUserSolo2?.id === user.id) setSelectedUserSolo2(selectedUserSolo1);
            setSelectedUserSolo1(user);
        } else {
            if (selectedUserSolo1?.id === user.id) setSelectedUserSolo1(selectedUserSolo2);
            setSelectedUserSolo2(user);
        }
        closeUserListModal();
    }, [closeUserListModal, currentUserSelectorSolo, selectedUserSolo1, selectedUserSolo2]);

    const swapUsers = useCallback(() => {
        setSelectedUserSolo1(selectedUserSolo2);
        setSelectedUserSolo2(selectedUserSolo1);
    }, [selectedUserSolo1, selectedUserSolo2]);

    // --- Позиції ---
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

    // Сканер додає позиції в один список; порожній початковий рядок при цьому замінюється
    const addScannedItem = useCallback((item: DebtItem) => {
        setDebtItemsSolo(prev => {
            if (prev.length === 1 && prev[0].text === '' && prev[0].num === '0') return [item];
            return [...prev, item];
        });
    }, []);

    const resetForm = useCallback(() => {
        setDebtItemsSolo([EMPTY_ITEM]);
        setSelectedUserSolo1(currentUser);
        setSelectedUserSolo2(null);
    }, [currentUser]);

    const confirmClear = () => {
        appAlert(
            'Очистити форму?',
            'Обраних людей і всі позиції буде прибрано.',
            [
                { text: 'Скасувати', style: 'cancel' },
                { text: 'Очистити', style: 'destructive', onPress: resetForm },
            ]
        );
    };

    // --- Створення ---
    const validateDebtItems = () => {
        if (!selectedUserSolo1 || !selectedUserSolo2) {
            setError('Оберіть, хто винен і кому');
            return false;
        }

        // Борг можна записати лише за своєї участі: чужі борги автор не бачить і не може підтвердити
        if (selectedUserSolo1.id !== currentUser?.id && selectedUserSolo2.id !== currentUser?.id) {
            setError('Ви маєте бути однією зі сторін боргу');
            return false;
        }

        // Сума — щонайменше копійка: порожнє поле, сама крапка чи 0.001 не проходять
        const hasEmptyAmount = debtItemsSolo.some(item => !isValidDebtAmount(Number(item.num)));

        if (hasEmptyAmount) {
            setError('Вкажіть суму в кожній позиції або видаліть порожні');
            return false;
        }

        return true;
    };

    const handleCreateDebtSolo = () => {
        setError(null); // Clear previous error
        if (!validateDebtItems()) return;

        setConfirmModalVisible(true);
    };

    const confirmDebtCreation = async () => {
        setError(null);
        if (!selectedUserSolo1 || !selectedUserSolo2 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const deptId = Date.now().toString();

            await createDebts(debtItemsSolo
                .filter(item => item.num)
                .map(item => ({
                    deptId: deptId,
                    fromUserId: selectedUserSolo1.id,
                    toUserId: selectedUserSolo2.id,
                    text: item.text?.trim() || 'Без опису',
                    amount: Number(Number(item.num).toFixed(2)),
                })));

            // Push-сповіщення кожному учаснику, крім того, хто створює борг (notifyUser сам пропускає себе)
            const debtor = selectedUserSolo1;
            const creditor = selectedUserSolo2;
            const totalAmount = Number(debtItemsSolo
                .reduce((sum, item) => sum + (parseFloat(item.num) || 0), 0)
                .toFixed(2));
            notifyUser(debtor.id, 'eBorg', `${creditor.name}: ваш борг ${totalAmount} ${currencySymbol}`);
            notifyUser(creditor.id, 'eBorg', `${debtor.name}: борг вам ${totalAmount} ${currencySymbol}`);

            setIsSuccess(true);
            // Reset form after delay
            setTimeout(() => {
                setIsSuccess(false);
                setConfirmModalVisible(false);
                resetForm();
            }, 2000);

        } catch (error) {
            console.error('Error creating debts:', error);
            // Повідомлення про помилку живе на формі, тому вікно підтвердження закриваємо
            setConfirmModalVisible(false);
            setError('Не вдалося створити борг. Спробуйте ще раз');
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = calculateTotalSolo();

    return (
        <View style={formStyles.container}>
            <ScrollView
                contentContainerStyle={formStyles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {header}
                {/* Хто → кому: дві плашки в один рядок, між ними — «поміняти місцями» */}
                <PeopleBar
                    middle={
                        <TouchableOpacity
                            style={[styles.swapButton, { backgroundColor: surface }, !selectedUserSolo1 && !selectedUserSolo2 && styles.swapButtonDisabled]}
                            onPress={swapUsers}
                            disabled={!selectedUserSolo1 && !selectedUserSolo2}
                            accessibilityRole="button"
                            accessibilityLabel="Поміняти місцями, хто винен і кому"
                        >
                            <Icon name="swap-horizontal" size={18} color={colors.text} />
                        </TouchableOpacity>
                    }
                >
                    <PersonChip
                        label="Хто винен"
                        placeholder="Обрати"
                        users={selectedUserSolo1 ? [selectedUserSolo1] : []}
                        onPress={() => openUserListModalSolo('user1')}
                    />
                    <PersonChip
                        label="Кому"
                        placeholder="Обрати"
                        users={selectedUserSolo2 ? [selectedUserSolo2] : []}
                        onPress={() => openUserListModalSolo('user2')}
                    />
                </PeopleBar>

                {/* Що саме */}
                <ItemsHeader
                    isViewMode={isViewMode}
                    onToggleViewMode={() => setIsViewMode(value => !value)}
                    onScan={() => setIsScannerVisible(true)}
                />
                <View style={[formStyles.card, formStyles.itemsCard, { backgroundColor: surface }]}>
                    {debtItemsSolo.map((item, index) => (
                        <DebtItemComponent
                            key={item.id}
                            ref={index === debtItemsSolo.length - 1 ? lastItemRef : null}
                            id={item.id}
                            text={item.text}
                            num={item.num.toString()}
                            onTextChange={(text) => updateDebtItemSolo(item.id, 'text', text)}
                            onNumChange={(num) => updateDebtItemSolo(item.id, 'num', num)}
                            onDelete={() => deleteDebtItemSolo(item.id)}
                            isLast={false}
                            isOnly={debtItemsSolo.length === 1}
                            onAdd={addDebtItemSolo}
                            isViewMode={isViewMode}
                            index={index}
                            totalCount={debtItemsSolo.length}
                        />
                    ))}
                    {!isViewMode && <AddItemButton onPress={addDebtItemSolo} />}
                </View>

                {hasData && (
                    <View>
                        <ClearFormButton onPress={confirmClear} />
                    </View>
                )}
            </ScrollView>

            {/* Скільки разом і головна дія */}
            <FormFooter
                rows={[{ label: 'Разом', value: `${formatAmount(total)} ${currencySymbol}`, primary: true }]}
                buttonLabel="Створити борг"
                onPress={handleCreateDebtSolo}
            >
                <ErrorToast error={error} onHide={() => setError(null)} style={formStyles.toast} />
            </FormFooter>

            <UserSelectionModal
                visible={isUserListModalVisible}
                onClose={closeUserListModal}
                title={currentUserSelectorSolo === 'user1' ? 'Хто винен' : 'Кому винен'}
                userList={userList}
                currentUserId={currentUser?.id}
                isSelected={(user) => user.id === (currentUserSelectorSolo === 'user1' ? selectedUserSolo1?.id : selectedUserSolo2?.id)}
                onSelect={handleUserSelectionChangeSolo}
                // Людину з іншого боку теж можна обрати: тоді сторони поміняються місцями
                getTag={(user) => {
                    if (currentUserSelectorSolo === 'user1' && user.id === selectedUserSolo2?.id) return 'зараз у «Кому винен»';
                    if (currentUserSelectorSolo === 'user2' && user.id === selectedUserSolo1?.id) return 'зараз у «Хто винен»';
                    return undefined;
                }}
            />

            <ConfirmDebtModal
                visible={confirmModalVisible}
                onClose={() => {
                    setConfirmModalVisible(false);
                    setIsSuccess(false);
                }}
                onConfirm={confirmDebtCreation}
                summary={{
                    rows: [
                        { label: 'Хто винен', value: selectedUserSolo1 ? displayName(selectedUserSolo1) : '—' },
                        { label: 'Кому', value: selectedUserSolo2 ? displayName(selectedUserSolo2) : '—' },
                        { label: 'Позицій', value: String(debtItemsSolo.length) },
                    ],
                    amountLabel: 'Сума боргу',
                    amount: total,
                }}
                isSuccess={isSuccess}
                isSubmitting={isSubmitting}
            />

            <QRScannerModal
                visible={isScannerVisible}
                onClose={() => setIsScannerVisible(false)}
                users={[selectedUserSolo1, selectedUserSolo2].filter((u): u is User => u !== null)}
                onAddUserItem={(userId, item) => addScannedItem(item)}
                onAddTotalItem={addScannedItem}
            />
        </View>
    );
};

const styles = appStyles({
    swapButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    swapButtonDisabled: {
        opacity: 0.4,
    },
});

export default SoloTab;
