import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface ErrorToastProps {
    error: string | null;
    onHide?: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ error, onHide }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (error) {
            Animated.sequence([
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
            ]).start(() => {
                if (onHide) onHide();
            });
        }
    }, [error, fadeAnim, onHide]);

    if (!error) return null;

    return (
        <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
            <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E53935',
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    errorText: {
        color: '#E53935',
        fontSize: 14,
        fontFamily: 'Montserrat',
        textAlign: 'center',
    },
});

export default ErrorToast;
