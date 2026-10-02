import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors } from '../constants/Colors';

export type ThemeType = 'light' | 'dark' | 'system';
export type DetailsBlockSizeType = 'small' | 'medium' | 'large';

interface ThemeContextProps {
  theme: ThemeType;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeType) => void;
  textScale: number;
  setTextScale: (val: number) => void;
  accentColor: string;
  setAccentColor: (val: string) => void;
  detailsBlockSize: DetailsBlockSizeType;
  setDetailsBlockSize: (val: DetailsBlockSizeType) => void;
  showDecimalsBalance: boolean;
  setShowDecimalsBalance: (val: boolean) => void;
  showDecimalsStatistics: boolean;
  setShowDecimalsStatistics: (val: boolean) => void;
  wrapStatisticsText: boolean;
  setWrapStatisticsText: (val: boolean) => void;
  currencySymbol: string;
  setCurrencySymbol: (val: string) => void;
  resetToDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceTheme = useDeviceColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [textScale, setTextScaleState] = useState<number>(1.0);
  const [accentColor, setAccentColorState] = useState<string>('default');
  const [detailsBlockSize, setDetailsBlockSizeState] = useState<DetailsBlockSizeType>('medium');
  const [showDecimalsBalance, setShowDecimalsBalanceState] = useState<boolean>(true);
  const [showDecimalsStatistics, setShowDecimalsStatisticsState] = useState<boolean>(true);
  const [wrapStatisticsText, setWrapStatisticsTextState] = useState<boolean>(false);
  const [currencySymbol, setCurrencySymbolState] = useState<string>('грн');
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
        
        const savedAccent = await AsyncStorage.getItem('@app_accent');
        if (savedAccent) setAccentColorState(savedAccent);
        
        const savedBlockSize = await AsyncStorage.getItem('@app_block_size');
        if (savedBlockSize) setDetailsBlockSizeState(savedBlockSize as DetailsBlockSizeType);

        const savedDecimalsBalance = await AsyncStorage.getItem('@app_decimals_balance');
        if (savedDecimalsBalance !== null) setShowDecimalsBalanceState(savedDecimalsBalance === 'true');

        const savedDecimalsStat = await AsyncStorage.getItem('@app_decimals_stat');
        if (savedDecimalsStat !== null) setShowDecimalsStatisticsState(savedDecimalsStat === 'true');

        const savedWrapStatText = await AsyncStorage.getItem('@app_wrap_stat_text');
        if (savedWrapStatText !== null) setWrapStatisticsTextState(savedWrapStatText === 'true');

        const savedCurrencySymbol = await AsyncStorage.getItem('@app_currency_symbol');
        if (savedCurrencySymbol !== null) setCurrencySymbolState(savedCurrencySymbol);
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

  const setAccentColor = useCallback((val: string) => {
    setAccentColorState(val);
    persist('@app_accent', val);
  }, []);

  const setDetailsBlockSize = useCallback((val: DetailsBlockSizeType) => {
    setDetailsBlockSizeState(val);
    persist('@app_block_size', val);
  }, []);

  const setShowDecimalsBalance = useCallback((val: boolean) => {
    setShowDecimalsBalanceState(val);
    persist('@app_decimals_balance', val.toString());
  }, []);

  const setShowDecimalsStatistics = useCallback((val: boolean) => {
    setShowDecimalsStatisticsState(val);
    persist('@app_decimals_stat', val.toString());
  }, []);

  const setWrapStatisticsText = useCallback((val: boolean) => {
    setWrapStatisticsTextState(val);
    persist('@app_wrap_stat_text', val.toString());
  }, []);

  const setCurrencySymbol = useCallback((val: string) => {
    setCurrencySymbolState(val);
    persist('@app_currency_symbol', val);
  }, []);

  const resetToDefaults = useCallback(() => {
    setThemeState('system');
    setTextScaleState(1.0);
    setAccentColorState('default');
    setDetailsBlockSizeState('medium');
    setShowDecimalsBalanceState(true);
    setShowDecimalsStatisticsState(true);
    setWrapStatisticsTextState(false);
    setCurrencySymbolState('грн');
    AsyncStorage.multiRemove([
      '@app_theme', '@app_density', '@app_accent', '@app_block_size',
      '@app_decimals_balance', '@app_decimals_stat', '@app_wrap_stat_text', '@app_currency_symbol'
    ]).catch(() => {});
  }, []);

  const isDark = theme === 'system' ? deviceTheme === 'dark' : theme === 'dark';

  const colors = useMemo<ThemeColors>(() => {
    const baseColors = isDark ? Colors.dark : Colors.light;
    return accentColor === 'default' ? baseColors : {
      ...baseColors,
      buttonBg: accentColor,
      tabIconSelected: accentColor,
    };
  }, [isDark, accentColor]);

  const value = useMemo<ThemeContextProps>(() => ({
    theme, isDark, colors, setTheme,
    textScale, setTextScale,
    accentColor, setAccentColor,
    detailsBlockSize, setDetailsBlockSize,
    showDecimalsBalance, setShowDecimalsBalance,
    showDecimalsStatistics, setShowDecimalsStatistics,
    wrapStatisticsText, setWrapStatisticsText,
    currencySymbol, setCurrencySymbol,
    resetToDefaults
  }), [
    theme, isDark, colors, textScale, accentColor, detailsBlockSize,
    showDecimalsBalance, showDecimalsStatistics, wrapStatisticsText, currencySymbol,
    setTheme, setTextScale, setAccentColor, setDetailsBlockSize, setShowDecimalsBalance,
    setShowDecimalsStatistics, setWrapStatisticsText, setCurrencySymbol, resetToDefaults,
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
