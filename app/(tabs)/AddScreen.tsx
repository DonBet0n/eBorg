import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SoloTab from '../../components/AddScreen/Solo';
import MultyTab from '../../components/AddScreen/Multy';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useAppTheme } from '../../contexts/ThemeContext';

import { useNavigation } from 'expo-router';

const AddScreen: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<'solo' | 'multy'>('solo');
    // Список користувачів береться з локального кешу, який синхронізує FirebaseContext
    const { users } = useFirebase();
    const { colors } = useAppTheme();
    const navigation = useNavigation();
    const [soloHasData, setSoloHasData] = useState(false);
    const [multyHasData, setMultyHasData] = useState(false);

    useEffect(() => {
        navigation.setOptions({ swipeEnabled: !(soloHasData || multyHasData) });
    }, [soloHasData, multyHasData, navigation]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.tabBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TouchableOpacity
                    style={[
                        styles.tabButton, 
                        { backgroundColor: colors.card },
                        selectedTab === 'solo' && { backgroundColor: colors.buttonBg }
                    ]}
                    onPress={() => setSelectedTab('solo')}
                >
                    <Text style={[
                        styles.tabButtonText, 
                        { color: colors.textSecondary },
                        selectedTab === 'solo' && { color: colors.buttonText }
                    ]}>Solo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tabButton, 
                        { backgroundColor: colors.card },
                        selectedTab === 'multy' && { backgroundColor: colors.buttonBg }
                    ]}
                    onPress={() => setSelectedTab('multy')}
                >
                    <Text style={[
                        styles.tabButtonText, 
                        { color: colors.textSecondary },
                        selectedTab === 'multy' && { color: colors.buttonText }
                    ]}>Multy</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, display: selectedTab === 'solo' ? 'flex' : 'none', marginTop: 10 }}>
                <SoloTab userList={users} onHasDataChange={setSoloHasData} />
            </View>
            <View style={{ flex: 1, display: selectedTab === 'multy' ? 'flex' : 'none', marginTop: 10 }}>
                <MultyTab userList={users} onHasDataChange={setMultyHasData} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingTop: 20,
    },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    activeTabButton: {
        backgroundColor: '#000',
    },
    tabButtonText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Montserrat',
    },
    activeTabButtonText: {
        color: '#fff',
        fontFamily: 'MontserratBold',
    },
});

export default AddScreen;