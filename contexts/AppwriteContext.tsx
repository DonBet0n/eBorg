import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Client, Account, Databases, Storage, Query, Models } from 'react-native-appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Debt } from '../types/debt';
import NetInfo from '@react-native-community/netinfo';

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
  debts: any[] | null;
  lastUpdate: Date | null;
  refreshDebts: () => Promise<void>;
  isOnline: boolean;
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
  debts: null,
  lastUpdate: null,
  refreshDebts: async () => {},
  isOnline: true,
});

type AppwriteDebtDocument = Omit<Debt, 'id'> & Models.Document;

export function AppwriteProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [debts, setDebts] = useState<any[] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const client = new Client();
  const account = new Account(client);
  const databases = new Databases(client);

  client
    .setEndpoint(APPWRITE.endpoint)
    .setProject(APPWRITE.project);

  // Додаємо відслідковування стану мережі
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

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
      await AsyncStorage.clear(); // Очищаємо весь кеш включно з боргами
      setUser(null);
      setDebts(null);
      setLastUpdate(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [account]);

  const getUserDebts = async () => {
    try {
      // Перевіряємо стан мережі перед будь-якими запитами
      if (!isOnline) {
        const cachedData = await AsyncStorage.getItem('cachedDebts');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setDebts(parsedData);
          return parsedData;
        }
        return [];
      }

      // Перевіряємо кеш тільки якщо є інтернет
      const cachedData = await AsyncStorage.getItem('cachedDebts');
      const cachedTime = await AsyncStorage.getItem('debtsLastUpdate');
      
      if (cachedData && cachedTime && 
          (new Date().getTime() - new Date(cachedTime).getTime() < 60000)) {
        const parsedData = JSON.parse(cachedData);
        setDebts(parsedData);
        return parsedData;
      }

      // Якщо немає інтернету, повертаємо кешовані дані або пустий масив
      if (!isOnline) {
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        return [];
      }

      // В іншому випадку робимо запит до серверу
      if (!user?.id) {
        console.warn('No user found');
        return [];
      }
      
      let allDocuments: AppwriteDebtDocument[] = [];
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const response = await databases.listDocuments(
          APPWRITE.databases.main,
          APPWRITE.databases.collections.debts,
          [
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
            Query.offset(offset)
          ]
        );

        if (!response?.documents || response.documents.length === 0) {
          break;
        }

        allDocuments = [...allDocuments, ...response.documents as AppwriteDebtDocument[]];
        
        if (response.documents.length < limit) {
          break;
        }
        
        offset += limit;
      }

      const uniqueUserIds = Array.from(new Set(
        allDocuments
          .filter(debt => debt.fromUserId === user.id || debt.toUserId === user.id)
          .map(debt => debt.fromUserId === user.id ? debt.toUserId : debt.fromUserId)
      ));

      if (uniqueUserIds.length === 0) {
        return [];
      }

      const usersResponse = await databases.listDocuments(
        APPWRITE.databases.main,
        APPWRITE.databases.collections.users,
        [
          Query.equal('$id', uniqueUserIds)
        ]
      );

      const userDataMap = new Map(
        usersResponse.documents.map(userData => [
          userData.$id,
          {
            name: userData.name,
            secondName: userData.secondName
          }
        ])
      );

      const debtsByUser = allDocuments.reduce((acc: Record<string, any>, debt) => {
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
          
          if (!isNaN(Number(debt.amount))) {
            const amount = Number(debt.amount);
            acc[otherUserId].totalAmount += debt.fromUserId === user.id ? -amount : amount;
            
            acc[otherUserId].items.push({
              id: debt.$id,
              text: debt.text?.trim() || 'Без опису',
              fromUserId: debt.fromUserId,
              toUserId: debt.toUserId,
              amount: amount,
              date: debt.$createdAt // Переконайтесь, що це поле існує і має правильний формат
            });
          }
        }
        return acc;
      }, {});

      // Зберігаємо результат в кеш
      const result = Object.values(debtsByUser);
      await AsyncStorage.setItem('cachedDebts', JSON.stringify(result));
      await AsyncStorage.setItem('debtsLastUpdate', new Date().toISOString());
      
      setDebts(result);
      setLastUpdate(new Date());
      return result;

    } catch (error) {
      console.error('Error fetching debts:', error);
      // При помилці або офлайн режимі повертаємо кешовані дані
      const cachedData = await AsyncStorage.getItem('cachedDebts');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setDebts(parsedData);
        return parsedData;
      }
      return [];
    }
  };

  const refreshDebts = async () => {
    // Не оновлюємо дані якщо немає інтернету
    if (!isOnline) {
      return;
    }
    
    setLastUpdate(null); // Скидаємо кеш
    // Очищаємо кеш на пристрої
    await AsyncStorage.removeItem('cachedDebts');
    await AsyncStorage.removeItem('debtsLastUpdate');
    await getUserDebts(); // Примусово отримуємо нові дані
  };

  // Додаємо автоматичне оновлення кожну хвилину
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        refreshDebts();
      }
    }, 60000); // 60000 ms = 1 хвилина

    return () => clearInterval(interval);
  }, [user]);

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
      logout,
      debts,
      lastUpdate,
      refreshDebts,
      isOnline,
    }}>
      {children}
    </AppwriteContext.Provider>
  );
}

export const useAppwrite = () => useContext(AppwriteContext);

export { client, account, databases };
