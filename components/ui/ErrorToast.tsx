import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Icon from '@/components/ui/Icon';
import { useAppTheme } from '../../contexts/ThemeContext';
import { appStyles } from '@/utils/appStyles';

interface ErrorToastProps {
    error: string | null;
    onHide?: () => void;
    style?: StyleProp<ViewStyle>;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ error, onHide, style }) => {
    const { colors, isDark } = useAppTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    // onHide зазвичай створюється заново при кожному рендері; тримаємо його в ref,
    // щоб повідомлення не зникало раніше часу, коли екран перемальовується
    const onHideRef = useRef(onHide);
    onHideRef.current = onHide;

    useEffect(() => {
        if (!error) return;

        const animation = Animated.sequence([
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
        ]);
        animation.start(({ finished }) => {
            if (finished) onHideRef.current?.();
        });

        return () => animation.stop();
    }, [error, fadeAnim]);

    if (!error) return null;

    return (
        <Animated.View
            style={[
                styles.errorContainer,
                { backgroundColor: isDark ? colors.cardAlt : colors.background, borderColor: colors.negativeText, opacity: fadeAnim },
                style,
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <View style={[styles.iconCircle, { backgroundColor: colors.negativeBg }]}>
                <Icon name="alert" size={16} color={colors.negativeText} />
            </View>
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        </Animated.View>
    );
};

const styles = appStyles({
    errorContainer: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'NunitoSansBold',
        letterSpacing: 0.3,
    },
});

export default ErrorToast;
