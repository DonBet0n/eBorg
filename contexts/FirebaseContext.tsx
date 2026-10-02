import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { Alert, AppState } from 'react-native';
import { User, Statistics, DebtGroup, Transaction } from '../types/debt';
import { calculateDebts, isPaymentRecord } from '../utils/debtCalculations';
import { registerForPushNotificationsAsync, sendPushNotification } from '../utils/pushNotifications';
import { devLog } from '../utils/logger';
import { readJson, writeJson, removeJson } from '../utils/localCache';

/*
 * Синхронізація даних:
 * - Борги та профілі зберігаються у файлах на пристрої і показуються одразу при запуску.
 * - З сервера тягнуться лише документи, у яких `updatedAt` новіший за останню синхронізацію.
 * - Видалений борг стирається з бази повністю. Дельта видалень не бачить, тому після синхронізації
 *   застосунок порівнює кількість боргів на сервері (`count()`, ~1 читання) з локальною.
 *   Якщо не збігається — цей напрямок перезавантажується повністю.
 * - "Повна синхронізація" скидає локальний кеш і завантажує все заново.
 */

type Direction = 'fromUserId' | 'toUserId';
const DIRECTIONS: Direction[] = ['fromUserId', 'toUserId'];

// Запас на випадок, якщо записи з близькими серверними мітками часу стали видимі не по порядку
const SYNC_OVERLAP_MS = 2 * 60 * 1000;
const FULL_SYNC_TIMEOUT_MS = 30 * 1000;
// Як часто перевіряти видалення при поверненні в застосунок
const VERIFY_THROTTLE_MS = 60 * 1000;
const CACHE_VERSION = 1;
const USERS_CACHE_FILE = 'users.json';
const debtsCacheFile = (uid: string) => `debts_${uid}.json`;

interface StoredDebt {
  id: string;
  deptId?: string;
  type?: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  amount: number;
  createdAt: number;
  updatedAt: number | null;
  // Створено на цьому пристрої, сервер ще не підтвердив
  local?: boolean;
}

interface DebtsCache {
  version: number;
  ownerId: string;
  lastSync: Record<Direction, number | null>;
  lastServerContact: number | null;
  debts: Record<string, StoredDebt>;
}

interface UsersCache {
  version: number;
  lastSync: number | null;
  users: Record<string, User>;
}

export interface NewDebt {
  fromUserId: string;
  toUserId: string;
  text: string;
  amount: number;
  deptId?: string;
  // 'payment' для оплати боргу
  type?: string;
}

export type FirebaseContextType = {
  auth: typeof auth;
  db: typeof firestore;
  user: User | null;
  setUser: (user: User | null) => void;
  getCurrentUser: () => Promise<User | null>;
  logout: () => Promise<void>;
  users: User[];
  debts: DebtGroup[] | null;
  statistics: Statistics;
  lastUpdate: Date | null;
  refreshDebts: () => Promise<void>;
  isOnline: boolean;
  fullSync: () => Promise<void>;
  dataSource: 'cache' | 'server' | 'unknown';
  createDebts: (debts: NewDebt[]) => Promise<void>;
  removeDebts: (ids: string[]) => Promise<void>;
  notifyUser: (userId: string, title: string, body: string) => Promise<void>;
};

const emptyStatistics: Statistics = {
  incomingDebts: 0,
  outgoingDebts: 0,
  activeDebtsCount: 0,
  totalBalance: 0
};

export const FirebaseContext = createContext<FirebaseContextType>({
  auth,
  db: firestore,
  user: null,
  setUser: () => {},
  getCurrentUser: async () => null,
  logout: async () => {},
  users: [],
  debts: null,
  statistics: emptyStatistics,
  lastUpdate: null,
  refreshDebts: async () => {},
  isOnline: true,
  fullSync: async () => {},
  dataSource: 'unknown',
  createDebts: async () => {},
  removeDebts: async () => {},
  notifyUser: async () => {},
});

const toMillis = (value: any): number | null => {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const time = new Date(value).getTime();
  return isNaN(time) ? null : time;
};

const parseDebt = (id: string, data: FirebaseFirestoreTypes.DocumentData): StoredDebt => ({
  id,
  deptId: data.deptId,
  ...(data.type ? { type: data.type } : {}),
  fromUserId: data.fromUserId,
  toUserId: data.toUserId,
  text: data.text?.trim() || 'Без опису',
  amount: Number(data.amount) || 0,
  createdAt: toMillis(data.createdAt) ?? 0,
  updatedAt: toMillis(data.updatedAt),
});

const parseUser = (id: string, data: FirebaseFirestoreTypes.DocumentData): User => ({
  id,
  name: data.name || '',
  email: data.email || '',
  secondName: data.secondName || '',
  avatar: data.avatar || '',
  ...(data.expoPushToken ? { expoPushToken: data.expoPushToken } : {}),
});

const emptyDebtsCache = (ownerId: string): DebtsCache => ({
  version: CACHE_VERSION,
  ownerId,
  lastSync: { fromUserId: null, toUserId: null },
  lastServerContact: null,
  debts: {},
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const isOnlineRef = useRef(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'cache' | 'server' | 'unknown'>('unknown');

  // Дані тримаються в ref, а зміна *Version перераховує похідні значення
  const debtsCacheRef = useRef<DebtsCache | null>(null);
  const [debtsVersion, setDebtsVersion] = useState(0);
  const usersCacheRef = useRef<UsersCache>({ version: CACHE_VERSION, lastSync: null, users: {} });
  const usersLoadedRef = useRef<Promise<void> | null>(null);
  const [usersVersion, setUsersVersion] = useState(0);
  const unknownUsersRef = useRef<Set<string>>(new Set());
  const profileRequestsRef = useRef<Set<string>>(new Set());

  const [syncEpoch, setSyncEpoch] = useState(0);
  const syncEpochRef = useRef(0);
  const forceFullSyncRef = useRef(false);
  const serverSyncWaitersRef = useRef<{ epoch: number; resolve: () => void }[]>([]);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyDeletionsRef = useRef<(() => Promise<void>) | null>(null);
  const lastVerifyRef = useRef(0);

  const uid = user?.id;

  // ---------- Локальне збереження ----------

  const persistDebtsNow = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const cache = debtsCacheRef.current;
    if (cache) writeJson(debtsCacheFile(cache.ownerId), cache);
  }, []);

  const schedulePersistDebts = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(persistDebtsNow, 500);
  }, [persistDebtsNow]);

  const debtsChanged = useCallback(() => {
    setDebtsVersion(v => v + 1);
    schedulePersistDebts();
  }, [schedulePersistDebts]);

  // Перед тим як застосунок піде у фон — дописуємо кеш на диск
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' && persistTimerRef.current) persistDebtsNow();
      // Повернулись у застосунок — перевіряємо, чи не видаляли борги, поки він був у фоні
      if (state === 'active' && isOnlineRef.current && Date.now() - lastVerifyRef.current > VERIFY_THROTTLE_MS) {
        lastVerifyRef.current = Date.now();
        verifyDeletionsRef.current?.();
      }
    });
    return () => subscription.remove();
  }, [persistDebtsNow]);

  const loadUsersCache = useCallback(() => {
    if (!usersLoadedRef.current) {
      usersLoadedRef.current = readJson<UsersCache>(USERS_CACHE_FILE).then(saved => {
        if (saved?.version === CACHE_VERSION) {
          usersCacheRef.current = {
            ...saved,
            // Не втрачаємо профілі, які встигли потрапити в пам'ять до завершення читання
            users: { ...saved.users, ...usersCacheRef.current.users },
          };
          setUsersVersion(v => v + 1);
        }
      });
    }
    return usersLoadedRef.current;
  }, []);

  useEffect(() => {
    loadUsersCache();
  }, [loadUsersCache]);

  const upsertUsers = useCallback((list: User[]) => {
    if (list.length === 0) return;
    const cache = usersCacheRef.current;
    usersCacheRef.current = { ...cache, users: { ...cache.users } };
    list.forEach(u => {
      usersCacheRef.current.users[u.id] = u;
      unknownUsersRef.current.delete(u.id);
    });
    setUsersVersion(v => v + 1);
    writeJson(USERS_CACHE_FILE, usersCacheRef.current);
  }, []);

  // Завантажує з сервера лише профілі, змінені після останньої синхронізації (або всі при full)
  const syncUsers = useCallback(async (full = false) => {
    await loadUsersCache();
    const cache = usersCacheRef.current;
    const isDelta = !full && cache.lastSync !== null;

    let query: FirebaseFirestoreTypes.Query = firestore().collection('users');
    if (isDelta) {
      query = query.where('updatedAt', '>', firestore.Timestamp.fromMillis(Math.max(0, cache.lastSync! - SYNC_OVERLAP_MS)));
    }
    const snap = await query.get({ source: 'server' });

    const users: Record<string, User> = isDelta ? { ...usersCacheRef.current.users } : {};
    let maxSeen = isDelta ? cache.lastSync! : 0;
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (!data) return;
      users[doc.id] = parseUser(doc.id, data);
      const updatedAt = toMillis(data.updatedAt);
      if (updatedAt && updatedAt > maxSeen) maxSeen = updatedAt;
    });

    if (!isDelta) unknownUsersRef.current.clear();
    usersCacheRef.current = { version: CACHE_VERSION, lastSync: maxSeen, users };
    setUsersVersion(v => v + 1);
    await writeJson(USERS_CACHE_FILE, usersCacheRef.current);
  }, [loadUsersCache]);

  // ---------- Мережа та авторизація ----------

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      isOnlineRef.current = online;
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
        const userDataRaw = userDoc.data();
        if (userDataRaw) {
          const userData = { id: firebaseUser.uid, ...userDataRaw } as User;

          try {
            const token = await registerForPushNotificationsAsync();
            if (token && userData.expoPushToken !== token) {
              userData.expoPushToken = token;
              await firestore().collection('users').doc(firebaseUser.uid).update({
                expoPushToken: token,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
            }
          } catch (e) {
            devLog('Failed to get push token', e);
          }

          setUser(userData);
          upsertUsers([parseUser(firebaseUser.uid, userDataRaw)]);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [upsertUsers]);

  const getCurrentUser = useCallback(async () => {
    const firebaseUser = auth().currentUser;
    if (!firebaseUser) return null;
    const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
    const userDataRaw = userDoc.data();
    if (userDataRaw) {
      const userData = { id: firebaseUser.uid, ...userDataRaw } as User;
      setUser(userData);
      upsertUsers([parseUser(firebaseUser.uid, userDataRaw)]);
      return userData;
    }
    return null;
  }, [upsertUsers]);

  const logout = useCallback(async () => {
    await auth().signOut();
    setUser(null);
  }, []);

  // При вході та при поверненні мережі — підтягуємо змінені профілі
  useEffect(() => {
    if (!uid || !isOnline) return;
    syncUsers().catch(e => devLog('Users sync error:', e));
  }, [uid, isOnline, syncUsers]);

  // ---------- Синхронізація боргів ----------

  useEffect(() => {
    if (!uid) {
      persistDebtsNow();
      debtsCacheRef.current = null;
      setDebtsVersion(v => v + 1);
      setDataSource('unknown');
      setLastUpdate(null);
      return;
    }

    const epoch = syncEpoch;
    let cancelled = false;
    const listeners: Record<Direction, (() => void) | null> = { fromUserId: null, toUserId: null };
    const fullMode: Record<Direction, boolean> = { fromUserId: false, toUserId: false };
    const serverSynced: Record<Direction, boolean> = { fromUserId: false, toUserId: false };
    const verified: Record<Direction, boolean> = { fromUserId: false, toUserId: false };
    const verifying: Record<Direction, boolean> = { fromUserId: false, toUserId: false };
    const maxSeen: Record<Direction, number> = { fromUserId: 0, toUserId: 0 };

    const applySnapshot = (field: Direction, snap: FirebaseFirestoreTypes.QuerySnapshot, isFull: boolean) => {
      const cache = debtsCacheRef.current;
      if (cancelled || !cache) return;

      snap.docChanges().forEach(change => {
        const doc = change.doc;
        if (change.type === 'removed') {
          delete cache.debts[doc.id];
          return;
        }
        const data = doc.data();
        if (!data) {
          delete cache.debts[doc.id];
        } else {
          cache.debts[doc.id] = parseDebt(doc.id, data);
        }
        const updatedAt = toMillis(data?.updatedAt);
        if (updatedAt && !doc.metadata.hasPendingWrites && updatedAt > maxSeen[field]) {
          maxSeen[field] = updatedAt;
        }
      });

      if (!snap.metadata.fromCache) {
        if (isFull) {
          // Повний запит — джерело правди: прибираємо те, чого вже немає на сервері
          const present = new Set(snap.docs.map(doc => doc.id));
          Object.values(cache.debts).forEach(debt => {
            if (debt[field] === uid && !debt.local && !present.has(debt.id)) {
              delete cache.debts[debt.id];
            }
          });
        }
        cache.lastSync[field] = Math.max(cache.lastSync[field] ?? 0, maxSeen[field]);
        cache.lastServerContact = Date.now();
        serverSynced[field] = true;

        if (serverSynced.fromUserId && serverSynced.toUserId) {
          setDataSource('server');
          setLastUpdate(new Date(cache.lastServerContact));
          serverSyncWaitersRef.current = serverSyncWaitersRef.current.filter(waiter => {
            if (waiter.epoch > epoch) return true;
            waiter.resolve();
            return false;
          });
        }

        // Після першої дельти перевіряємо, чи не видаляли щось, поки нас не було
        if (!isFull && !verified[field]) {
          verified[field] = true;
          verifyCount(field);
        }
      }

      debtsChanged();
    };

    const subscribe = (field: Direction, since: number | null) => {
      if (cancelled) return;
      listeners[field]?.();
      fullMode[field] = since === null;

      let query: FirebaseFirestoreTypes.Query = firestore().collection('debts').where(field, '==', uid);
      if (since !== null) {
        query = query.where('updatedAt', '>', firestore.Timestamp.fromMillis(Math.max(0, since - SYNC_OVERLAP_MS)));
      }
      listeners[field] = query.onSnapshot(
        snap => applySnapshot(field, snap, since === null),
        (error: any) => {
          devLog(`Firebase ${field} snapshot error:`, error);
          // Немає складеного індексу (field + updatedAt) — працюємо повним запитом, щоб нічого не зламалось
          if (since !== null && error?.code === 'firestore/failed-precondition') {
            subscribe(field, null);
          }
        }
      );
    };

    // Порівнює кількість боргів на сервері з локальною. Якщо різниться — хтось видаляв,
    // і цей напрямок перезавантажується повністю. Повний слухач далі сам бачить видалення наживо.
    const verifyCount = async (field: Direction) => {
      const cache = debtsCacheRef.current;
      if (cancelled || !cache || fullMode[field] || !serverSynced[field] || verifying[field]) return;
      // Поки власні записи не підтверджені сервером, порівнювати немає сенсу
      if (Object.values(cache.debts).some(debt => debt[field] === uid && debt.local)) return;

      verifying[field] = true;
      try {
        const snap = await firestore().collection('debts').where(field, '==', uid).count().get();
        if (cancelled || debtsCacheRef.current !== cache || fullMode[field]) return;
        const serverCount = snap.data().count;
        const localCount = Object.values(cache.debts).filter(debt => debt[field] === uid && !debt.local).length;
        if (serverCount !== localCount) {
          devLog(`Debts count mismatch (${field}): server ${serverCount}, local ${localCount}. Full resync.`);
          subscribe(field, null);
        }
      } catch (error) {
        devLog(`Debts count check error (${field}):`, error);
      } finally {
        verifying[field] = false;
      }
    };

    verifyDeletionsRef.current = async () => {
      await Promise.all(DIRECTIONS.map(verifyCount));
    };

    (async () => {
      let cache: DebtsCache | null = null;
      if (forceFullSyncRef.current) {
        forceFullSyncRef.current = false;
        await removeJson(debtsCacheFile(uid));
      } else {
        const saved = await readJson<DebtsCache>(debtsCacheFile(uid));
        if (saved?.version === CACHE_VERSION && saved.ownerId === uid) cache = saved;
      }
      if (cancelled) return;
      if (!cache) cache = emptyDebtsCache(uid);

      // Непідтверджені записи з минулої сесії не тримаємо: якщо запис дійшов до сервера, він прийде з дельтою
      Object.values(cache.debts).forEach(debt => {
        if (debt.local) delete cache!.debts[debt.id];
      });

      debtsCacheRef.current = cache;
      setDataSource('cache');
      setLastUpdate(cache.lastServerContact ? new Date(cache.lastServerContact) : null);
      setDebtsVersion(v => v + 1);

      DIRECTIONS.forEach(field => subscribe(field, cache!.lastSync[field]));
    })();

    return () => {
      cancelled = true;
      verifyDeletionsRef.current = null;
      DIRECTIONS.forEach(field => listeners[field]?.());
      persistDebtsNow();
    };
  }, [uid, syncEpoch, debtsChanged, persistDebtsNow]);

  // Довантажуємо профілі людей, з якими є борги, але яких немає в кеші
  useEffect(() => {
    if (!uid || !debtsCacheRef.current) return;
    let cancelled = false;
    loadUsersCache().then(() => {
      const cache = debtsCacheRef.current;
      if (cancelled || !cache) return;
      const missing = new Set<string>();
      Object.values(cache.debts).forEach(debt => {
        const otherId = debt.fromUserId === uid ? debt.toUserId : debt.fromUserId;
        if (!usersCacheRef.current.users[otherId] && !unknownUsersRef.current.has(otherId) && !profileRequestsRef.current.has(otherId)) {
          missing.add(otherId);
        }
      });
      missing.forEach(id => {
        profileRequestsRef.current.add(id);
        firestore().collection('users').doc(id).get()
          .then(doc => {
            const data = doc.data();
            if (data) {
              upsertUsers([parseUser(id, data)]);
            } else {
              unknownUsersRef.current.add(id);
              setUsersVersion(v => v + 1);
            }
          })
          .catch(() => {})
          .finally(() => profileRequestsRef.current.delete(id));
      });
    });
    return () => { cancelled = true; };
  }, [uid, debtsVersion, usersVersion, loadUsersCache, upsertUsers]);

  // ---------- Похідні дані ----------

  const debts = useMemo<DebtGroup[] | null>(() => {
    if (!uid) return [];
    const cache = debtsCacheRef.current;
    if (!cache) return null;

    const debtsByUser: Record<string, DebtGroup> = {};
    const sorted = Object.values(cache.debts).sort((a, b) => b.createdAt - a.createdAt);

    for (const debt of sorted) {
      const otherUserId = debt.fromUserId === uid ? debt.toUserId : debt.fromUserId;

      if (!debtsByUser[otherUserId]) {
        const profile = usersCacheRef.current.users[otherUserId];
        const userName = profile
          ? `${profile.name || ''} ${profile.secondName || ''}`.trim() || 'Невідомий користувач'
          : unknownUsersRef.current.has(otherUserId) ? 'Невідомий користувач' : 'Завантаження...';
        debtsByUser[otherUserId] = {
          userId: otherUserId,
          userName,
          userAvatar: profile?.avatar || undefined,
          items: [],
          totalAmount: 0
        };
      }

      debtsByUser[otherUserId].totalAmount += debt.fromUserId === uid ? -debt.amount : debt.amount;
      debtsByUser[otherUserId].items.push({
        id: debt.id,
        text: debt.text,
        fromUserId: debt.fromUserId,
        toUserId: debt.toUserId,
        amount: debt.amount,
        date: new Date(debt.createdAt),
        isPayment: isPaymentRecord(debt),
      } as Transaction);
    }

    return Object.values(debtsByUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, debtsVersion, usersVersion]);

  const statistics = useMemo<Statistics>(() => {
    if (!uid || !debts) return emptyStatistics;
    return calculateDebts(debts.flatMap(group => group.items), uid);
  }, [uid, debts]);

  const users = useMemo(() => {
    return Object.values(usersCacheRef.current.users).sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersVersion]);

  // ---------- Запис ----------

  // Чекаємо підтвердження сервера лише онлайн; офлайн Firestore поставить запис у чергу,
  // а дані вже показані локально. Якщо сервер відхилить запис — відкочуємо.
  const commitBatch = useCallback(async (batch: FirebaseFirestoreTypes.WriteBatch, rollback: () => void) => {
    const commit = batch.commit();
    if (isOnlineRef.current) {
      try {
        await commit;
      } catch (error) {
        rollback();
        throw error;
      }
    } else {
      commit.catch(error => {
        devLog('Offline write rejected:', error);
        rollback();
      });
    }
  }, []);

  const createDebts = useCallback(async (newDebts: NewDebt[]) => {
    if (newDebts.length === 0) return;
    const cache = debtsCacheRef.current;
    const batch = firestore().batch();
    const now = Date.now();
    const ids: string[] = [];

    newDebts.forEach(item => {
      const ref = firestore().collection('debts').doc();
      ids.push(ref.id);
      const data = {
        deptId: item.deptId ?? String(now),
        ...(item.type ? { type: item.type } : {}),
        fromUserId: item.fromUserId,
        toUserId: item.toUserId,
        text: item.text,
        amount: item.amount,
        createdAt: new Date(now),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      batch.set(ref, data);
      if (cache && uid && (item.fromUserId === uid || item.toUserId === uid)) {
        cache.debts[ref.id] = { ...parseDebt(ref.id, { ...data, updatedAt: null }), createdAt: now, local: true };
      }
    });
    debtsChanged();

    await commitBatch(batch, () => {
      const current = debtsCacheRef.current;
      if (!current) return;
      ids.forEach(id => {
        if (current.debts[id]?.local) delete current.debts[id];
      });
      debtsChanged();
    });
  }, [uid, debtsChanged, commitBatch]);

  const removeDebts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const cache = debtsCacheRef.current;
    const batch = firestore().batch();
    const removed: StoredDebt[] = [];

    ids.forEach(id => {
      batch.delete(firestore().collection('debts').doc(id));
      if (cache?.debts[id]) {
        removed.push(cache.debts[id]);
        delete cache.debts[id];
      }
    });
    debtsChanged();

    await commitBatch(batch, () => {
      const current = debtsCacheRef.current;
      if (!current) return;
      removed.forEach(debt => { current.debts[debt.id] = debt; });
      debtsChanged();
    });
  }, [debtsChanged, commitBatch]);

  // Push-сповіщення: токен береться з локального кешу профілів; з сервера читаємо лише якщо його там немає
  const notifyUser = useCallback(async (userId: string, title: string, body: string) => {
    if (!userId || userId === uid) return;
    try {
      let token = usersCacheRef.current.users[userId]?.expoPushToken;
      if (!token) {
        const doc = await firestore().collection('users').doc(userId).get();
        token = doc.data()?.expoPushToken;
      }
      await sendPushNotification(token, title, body);
    } catch (error) {
      devLog('Push notification error:', error);
    }
  }, [uid]);

  // ---------- Ручна синхронізація ----------

  // Нові борги приходять у реальному часі, тож pull-to-refresh довантажує змінені профілі
  // і перевіряє, чи не видаляли борги
  const refreshDebts = useCallback(async () => {
    if (!isOnlineRef.current) return;
    try {
      lastVerifyRef.current = Date.now();
      await Promise.all([syncUsers(), verifyDeletionsRef.current?.()]);
    } catch (error) {
      devLog('Refresh error:', error);
    }
  }, [syncUsers]);

  const fullSync = useCallback(async () => {
    if (!isOnlineRef.current) {
      Alert.alert('Немає підключення', 'Синхронізація неможлива без Інтернету.');
      return;
    }
    if (!uid) return;

    const epoch = ++syncEpochRef.current;
    const debtsSynced = new Promise<void>((resolve, reject) => {
      serverSyncWaitersRef.current.push({ epoch, resolve });
      setTimeout(() => reject(new Error('Full sync timeout')), FULL_SYNC_TIMEOUT_MS);
    });
    forceFullSyncRef.current = true;
    setSyncEpoch(epoch);

    try {
      await Promise.all([debtsSynced, syncUsers(true)]);
      Alert.alert('Успіх', 'Дані успішно синхронізовано з сервером!');
    } catch (error) {
      devLog('Full sync error:', error);
      Alert.alert('Помилка', 'Не вдалося синхронізуватися з сервером. Спробуйте пізніше.');
    }
  }, [uid, syncUsers]);

  return (
    <FirebaseContext.Provider value={{
      auth,
      db: firestore,
      user,
      setUser,
      getCurrentUser,
      logout,
      users,
      statistics,
      debts,
      lastUpdate,
      refreshDebts,
      isOnline,
      fullSync,
      dataSource,
      createDebts,
      removeDebts,
      notifyUser,
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);
