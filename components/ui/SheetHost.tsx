import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface SheetHostApi {
  mount: (key: string, node: React.ReactNode) => void;
  unmount: (key: string) => void;
}

const SheetHostContext = createContext<SheetHostApi | null>(null);

// Шторки малюються тут, поверх усього застосунку, у тому ж вікні, а не в окремому вікні RN Modal:
// на Android вікно Modal перебудовується при появі клавіатури, і на мить крізь нього видно екран позаду
export function SheetHost({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<{ key: string; node: React.ReactNode }[]>([]);

  const api = useMemo<SheetHostApi>(() => ({
    mount: (key, node) => setEntries(prev => {
      const index = prev.findIndex(entry => entry.key === key);
      if (index < 0) return [...prev, { key, node }];
      const next = [...prev];
      next[index] = { key, node };
      return next;
    }),
    unmount: key => setEntries(prev => prev.filter(entry => entry.key !== key)),
  }), []);

  return (
    <SheetHostContext.Provider value={api}>
      {children}
      {entries.length > 0 && (
        <View style={styles.layer} pointerEvents="box-none">
          {entries.map(entry => <React.Fragment key={entry.key}>{entry.node}</React.Fragment>)}
        </View>
      )}
    </SheetHostContext.Provider>
  );
}

export const useSheetHost = () => {
  const context = useContext(SheetHostContext);
  if (!context) throw new Error('useSheetHost must be used within a SheetHost');
  return context;
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
});
