import { createContext, useContext, useState, useCallback } from 'react';
import { Client, Account, Databases, Storage, Query } from 'react-native-appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/debt';

export const APPWRITE = {
  endpoint: 'https://cloud.appwrite.io/v1',
  project: '67dec7a30024ed296bb7',
  databases: {
    main: '67dec7fe00154b4030fc',
    collections: {
      users: '67df0ba4003654d88922',
      debts: '67deceff002acbaae85f'
    }
  },
  storage: {
    avatars: '67f66d20002b35011bb4'
  }
} as const;

const client = new Client()
    .setEndpoint(APPWRITE.endpoint)
    .setProject(APPWRITE.project);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export type AppwriteContextType = {
  client: Client;
  account: Account;
  databases: Databases;
  storage: Storage;
  user: User | null;
  setUser: (user: User | null) => void;
  getCurrentUser: () => Promise<User | null>;
  getUserDebts: () => Promise<any>;
  logout: () => Promise<void>;
};

export const AppwriteContext = createContext<AppwriteContextType>({
  client,
  account,
  databases,
  storage,
  user: null,
  setUser: () => {},
  getCurrentUser: async () => null,
  getUserDebts: async () => null,
  logout: async () => {},
});

export function AppwriteProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const client = new Client();
  const account = new Account(client);
  const databases = new Databases(client);

  client
    .setEndpoint(APPWRITE.endpoint)
    .setProject(APPWRITE.project);

  const getCurrentUser = useCallback(async () => {
    try {
      const cachedUser = await AsyncStorage.getItem('cachedUser');
      if (cachedUser) {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        return userData;
      }

      const currentAccount = await account.get();
      if (!currentAccount) return null;

      const userDoc = await databases.getDocument(
        APPWRITE.databases.main,
        APPWRITE.databases.collections.users,
        currentAccount.$id
      );

      const userData = {
        id: currentAccount.$id,
        email: currentAccount.email,
        name: userDoc.name,
        secondName: userDoc.secondName,
        avatar: userDoc.avatar,
      };

      await AsyncStorage.setItem('cachedUser', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }, [account, databases]);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession('current');
      await AsyncStorage.removeItem('cachedUser');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [account]);

  const getUserDebts = async () => {
    try {
      if (!user?.id) {
        console.warn('No user found');
        return [];
      }
      
      const response = await databases.listDocuments(
        APPWRITE.databases.main,
        APPWRITE.databases.collections.debts,
        [
          Query.orderDesc('$createdAt')
        ]
      );

      if (!response?.documents) {
        return [];
      }

      // Знаходимо унікальні ID користувачів
      const uniqueUserIds = Array.from(new Set(
        response.documents
          .filter(debt => debt.fromUserId === user.id || debt.toUserId === user.id)
          .map(debt => debt.fromUserId === user.id ? debt.toUserId : debt.fromUserId)
      ));

      // Якщо немає боргів, повертаємо пустий масив
      if (uniqueUserIds.length === 0) {
        return [];
      }

      // Отримуємо дані користувачів одним запитом
      const usersResponse = await databases.listDocuments(
        APPWRITE.databases.main,
        APPWRITE.databases.collections.users,
        [
          Query.equal('$id', uniqueUserIds)
        ]
      );

      // Створюємо мапу користувачів
      const userDataMap = new Map(
        usersResponse.documents.map(userData => [
          userData.$id,
          {
            name: userData.name,
            secondName: userData.secondName
          }
        ])
      );

      // Групуємо борги по користувачам
      const debtsByUser = response.documents.reduce((acc: Record<string, any>, debt) => {
        if (!debt?.fromUserId || !debt?.toUserId || !debt?.amount) return acc;

        if (debt.fromUserId === user.id || debt.toUserId === user.id) {
          const otherUserId = debt.fromUserId === user.id ? debt.toUserId : debt.fromUserId;
          const userData = userDataMap.get(otherUserId);
          
          if (!acc[otherUserId]) {
            acc[otherUserId] = {
              userId: otherUserId,
              userName: userData 
                ? `${userData.name} ${userData.secondName}`
                : 'Завантаження...',
              items: [],
              totalAmount: 0
            };
          }
          
          // Інші операції з боргами
          if (!isNaN(Number(debt.amount))) {
            acc[otherUserId].totalAmount += debt.fromUserId === user.id ? -Number(debt.amount) : Number(debt.amount);
            
            acc[otherUserId].items.push({
              id: debt.$id,
              text: debt.text?.trim() || 'Без опису',
              fromUserId: debt.fromUserId,
              toUserId: debt.toUserId,
              amount: Number(debt.amount),
              date: debt.createdAt
            });
          }
        }
        return acc;
      }, {});

      return Object.values(debtsByUser);
    } catch (error) {
      console.error('Error fetching debts:', error);
      return [];
    }
  };

  return (
    <AppwriteContext.Provider value={{ 
      client, 
      account, 
      databases,
      storage,
      user,
      setUser,
      getCurrentUser,
      getUserDebts,
      logout
    }}>
      {children}
    </AppwriteContext.Provider>
  );
}

export const useAppwrite = () => useContext(AppwriteContext);

export { client, account, databases };
