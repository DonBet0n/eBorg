import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';

interface ErrorToastProps {
    error: string | null;
    onHide?: () => void;
    style?: StyleProp<ViewStyle>;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ error, onHide, style }) => {
    const { colors } = useAppTheme();
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
            style={[styles.errorContainer, { backgroundColor: colors.card, borderColor: colors.negativeText, opacity: fadeAnim }, style]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <Text style={[styles.errorText, { color: colors.negativeText }]}>{error}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    errorContainer: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'NunitoSans',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
});

export default ErrorToast;
