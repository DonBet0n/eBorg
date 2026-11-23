import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors } from '../constants/Colors';
import { CORNER_SCALE_DEFAULT, CORNER_SCALE_MAX, CORNER_SCALE_MIN, setStyleScales } from '../utils/appStyles';

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextProps {
  theme: ThemeType;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeType) => void;
  textScale: number;
  setTextScale: (val: number) => void;
  showDecimalsBalance: boolean;
  setShowDecimalsBalance: (val: boolean) => void;
  showDecimalsStatistics: boolean;
  setShowDecimalsStatistics: (val: boolean) => void;
  currencySymbol: string;
  setCurrencySymbol: (val: string) => void;
  // Множник заокруглення кутів (див. utils/radius)
  cornerScale: number;
  setCornerScale: (val: number) => void;
  resetToDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceTheme = useDeviceColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [textScale, setTextScaleState] = useState<number>(1.0);
  const [showDecimalsBalance, setShowDecimalsBalanceState] = useState<boolean>(true);
  const [showDecimalsStatistics, setShowDecimalsStatisticsState] = useState<boolean>(true);
  const [currencySymbol, setCurrencySymbolState] = useState<string>('грн');
  const [cornerScale, setCornerScaleState] = useState<number>(CORNER_SCALE_DEFAULT);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeState(savedTheme);
        }

        const savedDensity = await AsyncStorage.getItem('@app_density');
        if (savedDensity) setTextScaleState(parseFloat(savedDensity));
        
        // Вибір кольору прибрано: старе збережене значення більше не потрібне
        AsyncStorage.removeItem('@app_accent').catch(() => {});
        // Так само прибрані налаштування розміру блоків і переносу тексту
        AsyncStorage.multiRemove(['@app_block_size', '@app_wrap_stat_text']).catch(() => {});
        

        const savedDecimalsBalance = await AsyncStorage.getItem('@app_decimals_balance');
        if (savedDecimalsBalance !== null) setShowDecimalsBalanceState(savedDecimalsBalance === 'true');

        const savedDecimalsStat = await AsyncStorage.getItem('@app_decimals_stat');
        if (savedDecimalsStat !== null) setShowDecimalsStatisticsState(savedDecimalsStat === 'true');


        const savedCurrencySymbol = await AsyncStorage.getItem('@app_currency_symbol');
        if (savedCurrencySymbol !== null) setCurrencySymbolState(savedCurrencySymbol);

        const savedCornerScale = parseFloat(await AsyncStorage.getItem('@app_corner_scale') ?? '');
        if (savedCornerScale >= CORNER_SCALE_MIN && savedCornerScale <= CORNER_SCALE_MAX) setCornerScaleState(savedCornerScale);
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Сеттери стабільні (useCallback), щоб значення контексту не змінювалось без потреби
  const persist = (key: string, value: string) => {
    AsyncStorage.setItem(key, value).catch(() => {});
  };

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    persist('@app_theme', newTheme);
  }, []);

  const setTextScale = useCallback((val: number) => {
    setTextScaleState(val);
    persist('@app_density', val.toString());
  }, []);

  const setShowDecimalsBalance = useCallback((val: boolean) => {
    setShowDecimalsBalanceState(val);
    persist('@app_decimals_balance', val.toString());
  }, []);

  const setShowDecimalsStatistics = useCallback((val: boolean) => {
    setShowDecimalsStatisticsState(val);
    persist('@app_decimals_stat', val.toString());
  }, []);

  const setCurrencySymbol = useCallback((val: string) => {
    setCurrencySymbolState(val);
    persist('@app_currency_symbol', val);
  }, []);

  const setCornerScale = useCallback((val: number) => {
    setCornerScaleState(val);
    persist('@app_corner_scale', val.toString());
  }, []);

  const resetToDefaults = useCallback(() => {
    setThemeState('system');
    setTextScaleState(1.0);
    setShowDecimalsBalanceState(true);
    setShowDecimalsStatisticsState(true);
    setCurrencySymbolState('грн');
    setCornerScaleState(CORNER_SCALE_DEFAULT);
    AsyncStorage.multiRemove([
      '@app_theme', '@app_density',
      '@app_decimals_balance', '@app_decimals_stat', '@app_currency_symbol',
      '@app_corner_scale',
    ]).catch(() => {});
  }, []);

  const isDark = theme === 'system' ? deviceTheme === 'dark' : theme === 'dark';

  const colors: ThemeColors = isDark ? Colors.dark : Colors.light;

  // Стилі з appStyles читають множник під час рендеру, тож він має бути виставлений раніше за екрани
  setStyleScales(cornerScale, textScale);

  const value = useMemo<ThemeContextProps>(() => ({
    theme, isDark, colors, setTheme,
    textScale, setTextScale,
    showDecimalsBalance, setShowDecimalsBalance,
    showDecimalsStatistics, setShowDecimalsStatistics,
    currencySymbol, setCurrencySymbol,
    cornerScale, setCornerScale,
    resetToDefaults
  }), [
    theme, isDark, colors, textScale,
    showDecimalsBalance, showDecimalsStatistics, currencySymbol, cornerScale,
    setTheme, setTextScale, setShowDecimalsBalance,
    setShowDecimalsStatistics, setCurrencySymbol, setCornerScale, resetToDefaults,
  ]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
};
