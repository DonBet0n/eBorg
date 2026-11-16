import { createContext, useContext } from 'react';

// Екрани вмикають/вимикають свайп між вкладками, напр. поки на «Додати» є незбережені позиції
const TabSwipeContext = createContext<(locked: boolean) => void>(() => {});

export const TabSwipeLockProvider = TabSwipeContext.Provider;

export const useSetTabSwipeLocked = () => useContext(TabSwipeContext);
