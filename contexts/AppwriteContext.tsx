import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Client, Account, Databases, Storage, Query, Models } from 'react-native-appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Debt, Statistics } from '../types/debt';
import NetInfo from '@react-native-community/netinfo';
import { calculateDebts } from '../utils/debtCalculations';

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
  statistics: Statistics;
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
  statistics: {
    incomingDebts: 0,
    outgoingDebts: 0,
    activeDebtsCount: 0,
    totalBalance: 0
  },
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
  const [statistics, setStatistics] = useState<Statistics>({
    incomingDebts: 0,
    outgoingDebts: 0,
    activeDebtsCount: 0,
    totalBalance: 0
  });
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

  const updateStatistics = useCallback((debtsData: any[]) => {
    if (!user?.id || !debtsData) return;

    const allDebts = debtsData.reduce((acc: any[], debt: any) => {
      const debtItems = (debt.items || []).map((item: any) => ({
        fromUserId: item.fromUserId,
        toUserId: item.toUserId,
        amount: item.amount
      }));
      return acc.concat(debtItems);
    }, []);

    const newStats = calculateDebts(allDebts, user.id);
    setStatistics(newStats);
  }, [user?.id]);

  const getUserDebts = async () => {
    try {
      if (!user?.id || !isOnline) {
        return [];
      }

      let allDocuments: AppwriteDebtDocument[] = [];
      let offset = 0;
      const limit = 100;
      
      // Отримуємо всі документи через пагінацію
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
        
        // Якщо отримали менше документів ніж ліміт, значить це останні документи
        if (response.documents.length < limit) {
          break;
        }

        offset += limit;
      }

      if (allDocuments.length === 0) {
        setDebts([]);
        updateStatistics([]);
        return [];
      }

      const uniqueUserIds = Array.from(new Set(
        allDocuments
          .filter((debt: AppwriteDebtDocument) => 
            debt.fromUserId === user.id || debt.toUserId === user.id
          )
          .map((debt: AppwriteDebtDocument) => 
            debt.fromUserId === user.id ? debt.toUserId : debt.fromUserId
          )
      ));

      if (uniqueUserIds.length === 0) {
        setDebts([]);
        updateStatistics([]);
        return [];
      }

      const usersResponse = await databases.listDocuments(
        APPWRITE.databases.main,
        APPWRITE.databases.collections.users,
        [
          Query.equal('$id', uniqueUserIds as string[])
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

      const debtsByUser = allDocuments.reduce((acc: Record<string, any>, debt: AppwriteDebtDocument) => {
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
              date: debt.$createdAt
            });
          }
        }
        return acc;
      }, {});

      const result = Object.values(debtsByUser);
      setDebts(result);
      updateStatistics(result);
      setLastUpdate(new Date());
      return result;

    } catch (error) {
      console.error('Error fetching debts:', error);
      setDebts([]);
      updateStatistics([]);
      return [];
    }
  };

  const refreshDebts = async () => {
    if (!isOnline) return;
    setLastUpdate(null);
    await getUserDebts();
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
      logout,
      statistics,
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
