import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  getAuth, // <-- повертаємо getAuth
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { User, Debt, Statistics } from '../types/debt';
import { calculateDebts } from '../utils/debtCalculations';
import { firebaseConfig } from './firebaseConfig';

// 1. Ініціалізація Firebase
const app = initializeApp(firebaseConfig);

// Використовуйте стандартний getAuth
const auth = getAuth(app);
const db = getFirestore(app);

export type FirebaseContextType = {
  auth: typeof auth;
  db: typeof db;
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
  triggerDebtsRefresh: () => void;
};

export const FirebaseContext = createContext<FirebaseContextType>({
  auth,
  db,
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
  triggerDebtsRefresh: () => {},
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
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
  const [debtsRefreshKey, setDebtsRefreshKey] = useState(0);

  // Додаємо автологін з кешу при старті
  useEffect(() => {
    const loadCachedUser = async () => {
      const cachedUser = await AsyncStorage.getItem('cachedUser');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }
    };
    loadCachedUser();
  }, []);

  // Відслідковування мережі
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // Відслідковування auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
          setUser(userData);
          await AsyncStorage.setItem('cachedUser', JSON.stringify(userData));
        }
      } else {
        // Якщо є cachedUser, не скидай користувача
        const cachedUser = await AsyncStorage.getItem('cachedUser');
        if (!cachedUser) {
          setUser(null);
        }
        // Не видаляй cachedUser тут!
      }
    });
    return () => unsubscribe();
  }, []);

  const getCurrentUser = useCallback(async () => {
    const cachedUser = await AsyncStorage.getItem('cachedUser');
    if (cachedUser) {
      const userData = JSON.parse(cachedUser);
      setUser(userData);
      return userData;
    }
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
      setUser(userData);
      await AsyncStorage.setItem('cachedUser', JSON.stringify(userData));
      return userData;
    }
    return null;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    await AsyncStorage.removeItem('cachedUser');
    setUser(null);
    setDebts(null);
    setLastUpdate(null);
  }, []);

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

  const getUserDebts = useCallback(async () => {
    if (!user?.id || !isOnline) return [];
    // Отримати всі борги, де user є або fromUserId, або toUserId
    const q = query(collection(db, 'debts'), 
      where('fromUserId', '==', user.id)
    );
    const q2 = query(collection(db, 'debts'), 
      where('toUserId', '==', user.id)
    );
    const [fromSnap, toSnap] = await Promise.all([getDocs(q), getDocs(q2)]);
    const allDocs = [...fromSnap.docs, ...toSnap.docs];
    if (allDocs.length === 0) {
      setDebts([]);
      updateStatistics([]);
      return [];
    }
    // Групування по іншому користувачу
    const debtsByUser: Record<string, any> = {};
    for (const docSnap of allDocs) {
      const debt = docSnap.data();
      const otherUserId = debt.fromUserId === user.id ? debt.toUserId : debt.fromUserId;
      if (!debtsByUser[otherUserId]) {
        // Отримати ім'я іншого користувача
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        debtsByUser[otherUserId] = {
          userId: otherUserId,
          userName: userDoc.exists() ? `${userDoc.data().name} ${userDoc.data().secondName || ''}` : 'Завантаження...',
          items: [],
          totalAmount: 0
        };
      }
      const amount = Number(debt.amount);
      debtsByUser[otherUserId].totalAmount += debt.fromUserId === user.id ? -amount : amount;
      debtsByUser[otherUserId].items.push({
        id: docSnap.id,
        text: debt.text?.trim() || 'Без опису',
        fromUserId: debt.fromUserId,
        toUserId: debt.toUserId,
        amount: amount,
        date: debt.createdAt?.toDate ? debt.createdAt.toDate() : debt.createdAt
      });
    }
    const result = Object.values(debtsByUser);
    setDebts(result);
    updateStatistics(result);
    setLastUpdate(new Date());
    return result;
  }, [user?.id, isOnline, db, updateStatistics]);

  // Оновлюємо debts лише коли debtsRefreshKey змінюється
  useEffect(() => {
    if (!user?.id || !isOnline) return;
    getUserDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtsRefreshKey, user?.id, isOnline]);

  // Викликаємо при старті додатку
  useEffect(() => {
    setDebtsRefreshKey((k) => k + 1);
  }, [user?.id]);

  const triggerDebtsRefresh = useCallback(() => {
    setDebtsRefreshKey((k) => k + 1);
  }, []);

  const refreshDebts = async () => {
    if (!isOnline) return;
    setLastUpdate(null);
    await getUserDebts();
  };

  return (
    <FirebaseContext.Provider value={{
      auth,
      db,
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
      triggerDebtsRefresh,
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);
