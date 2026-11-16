import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon, { IconName } from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import { User } from '../../types/debt';
import { useAppTheme } from '../../contexts/ThemeContext';

// Спільні частини форм «Між двома» та «Розділити чек»: обидві йдуть за схемою «хто → що → скільки»

export const displayName = (user: User) => `${user.name || ''} ${user.secondName || ''}`.trim() || 'Без імені';

// Поверхня картки і фон елементів усередині неї: у світлій темі картка сіра, тому вкладене біле
export const useFormColors = () => {
    const { colors, isDark } = useAppTheme();
    return {
        surface: isDark ? colors.card : colors.cardAlt,
        field: isDark ? colors.inputBg : colors.background,
    };
};

interface PersonRowProps {
    label: string;
    placeholder: string;
    users: User[];
    // Рядок для кількох людей показує значок групи замість аватара
    multiple?: boolean;
    divider?: boolean;
    onPress: () => void;
}

export const PersonRow = ({ label, placeholder, users, multiple, divider, onPress }: PersonRowProps) => {
    const { colors, textScale } = useAppTheme();
    const names = users.map(displayName).join(', ');
    const single = !multiple && users.length === 1 ? users[0] : null;

    return (
        <TouchableOpacity
            style={[styles.personRow, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${names || placeholder}`}
        >
            {single ? (
                <Avatar uri={single.avatar} name={single.name} size={40} />
            ) : (
                <View style={[styles.iconCircle, { backgroundColor: colors.border }]}>
                    <Icon name={multiple ? 'group' : 'person'} size={20} color={colors.textSecondary} />
                </View>
            )}
            <View style={styles.personText}>
                <Text style={[styles.personLabel, { color: colors.textSecondary, fontSize: 13 * textScale }]} numberOfLines={1}>
                    {label}{multiple && users.length > 0 ? ` · ${users.length}` : ''}
                </Text>
                <Text
                    style={[names ? styles.personValue : styles.personPlaceholder, { color: names ? colors.text : colors.textSecondary, fontSize: 16 * textScale }]}
                    numberOfLines={1}
                >
                    {names || placeholder}
                </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.iconSecondary} />
        </TouchableOpacity>
    );
};

interface ItemsHeaderProps {
    isViewMode: boolean;
    onToggleViewMode: () => void;
    onScan: () => void;
}

// Заголовок блоку позицій: сканер чека додає позиції, перемикач показує їх компактним списком
export const ItemsHeader = ({ isViewMode, onToggleViewMode, onScan }: ItemsHeaderProps) => {
    const { colors, textScale } = useAppTheme();
    const { surface } = useFormColors();

    const renderPill = (icon: IconName, label: string, onPress: () => void, accessibilityLabel: string) => (
        <TouchableOpacity
            style={[styles.pill, { backgroundColor: surface }]}
            onPress={onPress}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
        >
            <Icon name={icon} size={16} color={colors.text} />
            <Text style={[styles.pillText, { color: colors.text, fontSize: 13 * textScale }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.itemsHeader}>
            <Text accessibilityRole="header" style={[styles.itemsTitle, { color: colors.text, fontSize: 18 * textScale }]}>Позиції</Text>
            <View style={styles.pills}>
                {renderPill('qr-code-scanner', 'Сканувати', onScan, 'Сканувати чек')}
                {isViewMode
                    ? renderPill('edit', 'Редагувати', onToggleViewMode, 'Повернутися до редагування позицій')
                    : renderPill('visibility', 'Перегляд', onToggleViewMode, 'Показати позиції компактним списком')}
            </View>
        </View>
    );
};

interface SectionHeaderProps {
    leading: React.ReactNode;
    title: string;
    badge?: string;
    subtitle: string;
    amount: string;
    isOpen: boolean;
    onPress: () => void;
}

// Шапка блоку, що згортається: чиї позиції, з чого складається сума і сама сума
export const SectionHeader = ({ leading, title, badge, subtitle, amount, isOpen, onPress }: SectionHeaderProps) => {
    const { colors, textScale } = useAppTheme();

    return (
        <TouchableOpacity
            style={styles.sectionHeader}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            accessibilityLabel={`${title}${badge ? `, ${badge}` : ''}. ${amount}. ${subtitle}`}
        >
            {leading}
            <View style={styles.sectionBody}>
                <View style={styles.sectionTop}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * textScale }]} numberOfLines={1}>{title}</Text>
                    {!!badge && (
                        <View style={[styles.badge, { backgroundColor: colors.border }]}>
                            <Text style={[styles.badgeText, { color: colors.textSecondary, fontSize: 11 * textScale }]}>{badge}</Text>
                        </View>
                    )}
                    <Text style={[styles.sectionAmount, { color: colors.text, fontSize: 16 * textScale }]}>{amount}</Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontSize: 13 * textScale }]} numberOfLines={1}>{subtitle}</Text>
            </View>
            <Icon name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={colors.iconSecondary} />
        </TouchableOpacity>
    );
};

export const GroupIcon = () => {
    const { colors } = useAppTheme();
    return (
        <View style={[styles.iconCircle, { backgroundColor: colors.border }]}>
            <Icon name="group" size={20} color={colors.textSecondary} />
        </View>
    );
};

export const AddItemButton = ({ onPress }: { onPress: () => void }) => {
    const { colors, textScale } = useAppTheme();
    return (
        <TouchableOpacity style={styles.addItem} onPress={onPress} accessibilityRole="button">
            <Icon name="add" size={18} color={colors.text} />
            <Text style={[styles.addItemText, { color: colors.text, fontSize: 14 * textScale }]}>Додати позицію</Text>
        </TouchableOpacity>
    );
};

export const ClearFormButton = ({ onPress }: { onPress: () => void }) => {
    const { colors, textScale } = useAppTheme();
    return (
        <TouchableOpacity style={styles.clear} onPress={onPress} accessibilityRole="button">
            <Icon name="delete" size={18} color={colors.textSecondary} />
            <Text style={[styles.clearText, { color: colors.textSecondary, fontSize: 14 * textScale }]}>Очистити форму</Text>
        </TouchableOpacity>
    );
};

interface FooterRow {
    label: string;
    value: string;
    primary?: boolean;
}

interface FormFooterProps {
    rows: FooterRow[];
    buttonLabel: string;
    onPress: () => void;
    // Повідомлення про помилку: показується над підсумком
    children?: React.ReactNode;
}

// Закріплений низ форми: підсумок і головна дія
export const FormFooter = ({ rows, buttonLabel, onPress, children }: FormFooterProps) => {
    const { colors, textScale } = useAppTheme();

    return (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {children}
            {rows.map(row => (
                <View key={row.label} style={styles.footerRow}>
                    <Text style={[styles.footerLabel, { color: colors.textSecondary, fontSize: (row.primary ? 15 : 13) * textScale }]}>{row.label}</Text>
                    <Text
                        style={[
                            row.primary ? styles.footerValuePrimary : styles.footerValue,
                            { color: row.primary ? colors.text : colors.textSecondary, fontSize: (row.primary ? 22 : 14) * textScale },
                        ]}
                        numberOfLines={1}
                    >
                        {row.value}
                    </Text>
                </View>
            ))}
            <TouchableOpacity style={[styles.footerButton, { backgroundColor: colors.buttonBg }]} onPress={onPress} accessibilityRole="button">
                <Text style={[styles.footerButtonText, { color: colors.buttonText, fontSize: 16 * textScale }]}>{buttonLabel}</Text>
            </TouchableOpacity>
        </View>
    );
};

export const formStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 32,
    },
    card: {
        borderRadius: 20,
    },
    // Радіус поля всередині = радіус картки − відступ (20 − 8)
    itemsCard: {
        padding: 8,
        marginBottom: 16,
    },
    items: {
        paddingTop: 4,
    },
    hint: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    // Помилка стоїть одразу над підсумком, а не поверх кнопки
    toast: {
        bottom: '100%',
        marginBottom: 8,
    },
});

const styles = StyleSheet.create({
    personRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    personText: {
        flex: 1,
    },
    personLabel: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    personValue: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    personPlaceholder: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    itemsHeader: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 32,
        marginBottom: 14,
        paddingLeft: 4,
    },
    itemsTitle: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    pills: {
        flexDirection: 'row',
        gap: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 18,
    },
    pillText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    sectionBody: {
        flex: 1,
    },
    sectionTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    sectionTitle: {
        flexShrink: 1,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    badgeText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    sectionAmount: {
        marginLeft: 'auto',
        fontFamily: 'NunitoSansExtraBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    sectionSubtitle: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    addItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 44,
    },
    addItemText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    clear: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 44,
        marginTop: 16,
    },
    clearText: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    // Нижній відступ лишає місце кнопці «+», що виступає над навбаром
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 4,
    },
    footerLabel: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    footerValue: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    footerValuePrimary: {
        fontFamily: 'NunitoSansExtraBold',
        letterSpacing: 0.3,
        fontVariant: ['tabular-nums'],
    },
    footerButton: {
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 26,
        marginTop: 8,
    },
    footerButtonText: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
});
