import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import SoloTab from '../../components/AddScreen/Solo';
import MultyTab from '../../components/AddScreen/Multy';
import { useFormColors } from '../../components/AddScreen/FormParts';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useSetTabSwipeLocked } from '../../contexts/TabSwipeContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appStyles } from '@/utils/appStyles';

type Mode = 'solo' | 'multy';

const SWITCH_PADDING = 4;

// Два способи записати борг: одна людина винна іншій або один заплатив за компанію
const MODES: { key: Mode; label: string }[] = [
    { key: 'solo', label: 'Між двома' },
    { key: 'multy', label: 'Розділити чек' },
];

const AddScreen: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<Mode>('solo');
    // Список користувачів береться з локального кешу, який синхронізує FirebaseContext
    const { users } = useFirebase();
    const { colors, textScale } = useAppTheme();
    const { surface } = useFormColors();
    const insets = useSafeAreaInsets();
    // Поки в будь-якій формі є позиції, свайп між вкладками вимкнено, щоб випадково не піти з екрана
    const [soloHasItems, setSoloHasItems] = useState(false);
    const [multyHasItems, setMultyHasItems] = useState(false);
    const setSwipeLocked = useSetTabSwipeLocked();
    const hasItems = soloHasItems || multyHasItems;

    useEffect(() => {
        setSwipeLocked(hasItems);
    }, [hasItems, setSwipeLocked]);

    useEffect(() => () => setSwipeLocked(false), [setSwipeLocked]);

    // Ширина одного сегмента: повзунок їде рівно на неї
    const [segmentWidth, setSegmentWidth] = useState(0);
    const thumbX = useRef(new Animated.Value(0)).current;
    const selectedIndex = MODES.findIndex(mode => mode.key === selectedTab);

    useEffect(() => {
        Animated.spring(thumbX, {
            toValue: selectedIndex * segmentWidth,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
        }).start();
    }, [selectedIndex, segmentWidth, thumbX]);

    // Шапка (заголовок і перемикач) є в кожній формі й прокручується з нею;
    // повзунок спільний, тож у щойно показаній формі він плавно доїжджає до вибраного
    const header = (
        <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text, fontSize: 28 * textScale }]}>Новий борг</Text>
            <View
                style={[styles.modeSwitch, { backgroundColor: surface }]}
                accessibilityRole="tablist"
                onLayout={e => {
                    // Шапка у прихованій формі має нульову ширину — її вимір пропускаємо
                    const { width } = e.nativeEvent.layout;
                    if (width > 0) setSegmentWidth((width - SWITCH_PADDING * 2) / MODES.length);
                }}
            >
                {segmentWidth > 0 && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.modeThumb,
                            { width: segmentWidth, backgroundColor: colors.text, transform: [{ translateX: thumbX }] },
                        ]}
                    />
                )}
                {MODES.map(mode => {
                    const selected = selectedTab === mode.key;
                    return (
                        <TouchableOpacity
                            key={mode.key}
                            style={styles.modeButton}
                            onPress={() => setSelectedTab(mode.key)}
                            activeOpacity={0.7}
                            accessibilityRole="tab"
                            accessibilityState={{ selected }}
                        >
                            <Text
                                style={[
                                    selected ? styles.modeTextSelected : styles.modeText,
                                    { color: selected ? colors.background : colors.textSecondary, fontSize: 16 * textScale },
                                ]}
                                numberOfLines={1}
                            >
                                {mode.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Обидві форми лишаються змонтованими, щоб введене не губилось при перемиканні */}
            <View style={[styles.tab, selectedTab !== 'solo' && styles.hidden]}>
                <SoloTab userList={users} onHasItemsChange={setSoloHasItems} header={header} />
            </View>
            <View style={[styles.tab, selectedTab !== 'multy' && styles.hidden]}>
                <MultyTab userList={users} onHasItemsChange={setMultyHasItems} header={header} />
            </View>
        </View>
    );
};

const styles = appStyles({
    container: {
        flex: 1,
    },
    // Бічний відступ дає сама форма (16)
    header: {
        paddingTop: 8,
        marginBottom: 12,
    },
    // Як «Деталі» на сусідній вкладці
    title: {
        fontFamily: 'NunitoSansExtraBold',
        letterSpacing: 0.3,
        marginBottom: 12,
    },
    modeSwitch: {
        flexDirection: 'row',
        padding: SWITCH_PADDING,
        borderRadius: 999,
    },
    // Повзунок лежить під текстом сегментів і їде до вибраного
    modeThumb: {
        position: 'absolute',
        top: SWITCH_PADDING,
        bottom: SWITCH_PADDING,
        left: SWITCH_PADDING,
        borderRadius: 999,
    },
    modeButton: {
        flex: 1,
        minHeight: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeText: {
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
    },
    modeTextSelected: {
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
    tab: {
        flex: 1,
    },
    hidden: {
        display: 'none',
    },
});

export default AddScreen;
