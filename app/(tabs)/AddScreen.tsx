import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SoloTab from '../../components/AddScreen/Solo';
import MultyTab from '../../components/AddScreen/Multy';
import { User } from '../../types/debt';
import { useFirebase } from '../../contexts/FirebaseContext';
import { getDocs, collection } from 'firebase/firestore';

const AddScreen: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<'solo' | 'multy'>('solo');
    const [users, setUsers] = useState<User[]>([]);
    const { db } = useFirebase();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await getDocs(collection(db, 'users'));
                const fetchedUsers: User[] = response.docs.map(docSnap => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        name: data.name || '',
                        email: data.email || '',
                        secondName: data.secondName || '',
                        avatar: data.avatar || ''
                    };
                });
                setUsers(fetchedUsers);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, [db]);

    return (
        <View style={styles.container}>
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabButton, selectedTab === 'solo' && styles.activeTabButton]}
                    onPress={() => setSelectedTab('solo')}
                >
                    <Text style={[styles.tabButtonText, selectedTab === 'solo' && styles.activeTabButtonText]}>Solo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, selectedTab === 'multy' && styles.activeTabButton]}
                    onPress={() => setSelectedTab('multy')}
                >
                    <Text style={[styles.tabButtonText, selectedTab === 'multy' && styles.activeTabButtonText]}>Multy</Text>
                </TouchableOpacity>
            </View>

            {selectedTab === 'solo' && <SoloTab userList={users} />}
            {selectedTab === 'multy' && <MultyTab userList={users} />}
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
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    activeTabButton: {
        backgroundColor: '#000',
    },
    tabButtonText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Montserrat',
    },
    activeTabButtonText: {
        color: '#fff',
        fontFamily: 'MontserratBold',
    },
});

export default AddScreen;