import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import ColorPicker from 'react-native-wheel-color-picker';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAppTheme, ThemeType, DetailsBlockSizeType } from '../contexts/ThemeContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const CustomSwitch = ({ value, onValueChange, isDark, colors }: { value: boolean, onValueChange: (v: boolean) => void, isDark: boolean, colors: any }) => {
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 24]
  });

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? '#333333' : '#e0e0e0', colors.buttonBg]
  });

  const borderColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? '#333333' : '#e0e0e0', isDark ? '#ffffff' : '#aaaaaa']
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onValueChange(!value)}>
      <Animated.View style={{
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor,
        borderWidth: 1.5,
        borderColor,
        justifyContent: 'center',
      }}>
        <Animated.View style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#ffffff',
          transform: [{ translateX }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { fullSync, isOnline, lastUpdate, debts, dataSource } = useFirebase();
  const { 
    theme, setTheme, colors, isDark,
    textScale, setTextScale,
    accentColor, setAccentColor,
    detailsBlockSize, setDetailsBlockSize,
    showDecimalsBalance, setShowDecimalsBalance,
    showDecimalsStatistics, setShowDecimalsStatistics,
    wrapStatisticsText, setWrapStatisticsText,
    currencySymbol, setCurrencySymbol,
    resetToDefaults
  } = useAppTheme();
  const [isSyncing, setIsSyncing] = useState(false);
  const [localTextScale, setLocalTextScale] = useState(textScale);
  const [isColorPickerVisible, setColorPickerVisible] = useState(false);

  useEffect(() => {
    setLocalTextScale(textScale);
  }, [textScale]);

  const totalRecords = debts ? debts.reduce((acc, group) => acc + group.items.length, 0) : 0;

  const handleFullSync = () => {
    Alert.alert(
      'Повна синхронізація',
      'Ви впевнені, що хочете примусово завантажити всі дані безпосередньо з сервера? Це зігнорує локальний кеш і може зайняти деякий час.',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Оновити',
          onPress: async () => {
            setIsSyncing(true);
            await fullSync();
            setIsSyncing(false);
          }
        }
      ]
    );
  };

  const getDataSourceText = () => {
    if (dataSource === 'server') return 'Сервер (Онлайн)';
    if (dataSource === 'cache') return isOnline ? 'Локальний кеш (синхронізація...)' : 'Локальний кеш (Офлайн)';
    return 'Очікування...';
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} statusBarTranslucent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Налаштування</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={[styles.statsContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.statsHeader, { color: colors.text }]}>Оформлення</Text>
              <View style={styles.themeButtonsRow}>
                {(['light', 'dark', 'system'] as ThemeType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.themeBtn,
                      { borderColor: colors.border },
                      theme === t && { backgroundColor: colors.buttonBg, borderColor: colors.buttonBg }
                    ]}
                    onPress={() => setTheme(t)}
                  >
                    <Text style={[
                      styles.themeBtnText,
                      { color: colors.textSecondary },
                      theme === t && { color: colors.buttonText }
                    ]}>
                      {t === 'light' ? 'Світла' : t === 'dark' ? 'Темна' : 'Системна'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.settingSubLabel, { color: colors.textSecondary, marginTop: 16 }]}>Розмір тексту</Text>
              <View style={styles.sliderContainer}>
                <Text style={{ color: colors.textSecondary }}>А</Text>
                <Slider
                  style={{ flex: 1, marginHorizontal: 10 }}
                  minimumValue={0.5}
                  maximumValue={1.5}
                  step={0.1}
                  value={localTextScale}
                  onValueChange={setLocalTextScale}
                  onSlidingComplete={setTextScale}
                  minimumTrackTintColor={colors.buttonBg}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.buttonBg}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 20 }}>А</Text>
              </View>

              <Text style={[styles.settingSubLabel, { color: colors.textSecondary, marginTop: 16 }]}>Акцентний колір</Text>
              <View style={styles.colorRow}>
                {[
                  { name: 'default', color: '#000000' },
                  { name: '#2196F3', color: '#2196F3' }, // Blue
                  { name: '#4CAF50', color: '#4CAF50' }, // Green
                  { name: '#9C27B0', color: '#9C27B0' }, // Purple
                  { name: '#FF9800', color: '#FF9800' }, // Orange
                ].map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c.name === 'default' ? (theme === 'dark' ? '#fff' : '#000') : c.color },
                      accentColor === c.name && styles.colorCircleActive
                    ]}
                    onPress={() => setAccentColor(c.name)}
                  />
                ))}
              </View>
              <View style={styles.customColorContainer}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Montserrat', fontSize: 14 }}>Свій колір:</Text>
                <TouchableOpacity 
                  style={[styles.customColorInput, { backgroundColor: (!['default', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800'].includes(accentColor) ? accentColor : colors.inputBg), borderColor: colors.border }]}
                  onPress={() => setColorPickerVisible(true)}
                >
                  <Text style={{ color: (!['default', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800'].includes(accentColor) ? '#fff' : colors.textSecondary), textAlign: 'center' }}>
                    {!['default', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800'].includes(accentColor) ? accentColor : 'Обрати...'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.settingSubLabel, { color: colors.textSecondary, marginTop: 16 }]}>Розмір карток у деталях</Text>
              <View style={styles.themeButtonsRow}>
                {(['small', 'medium', 'large'] as DetailsBlockSizeType[]).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.themeBtn,
                      { borderColor: colors.border },
                      detailsBlockSize === size && { backgroundColor: colors.buttonBg, borderColor: colors.buttonBg }
                    ]}
                    onPress={() => setDetailsBlockSize(size)}
                  >
                    <Text style={[
                      styles.themeBtnText,
                      { color: colors.textSecondary },
                      detailsBlockSize === size && { color: colors.buttonText }
                    ]}>
                      {size === 'small' ? 'Малий' : size === 'medium' ? 'Середній' : 'Великий'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
                <MaterialIcons name="refresh" size={20} color="#F44336" />
                <Text style={styles.resetButtonText}>Скинути налаштування</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.statsContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border, marginTop: 16, paddingVertical: 12, paddingHorizontal: 16 }]}>
              <Text style={[styles.statsHeader, { color: colors.text, fontSize: 18, marginBottom: 12 }]}>Головна</Text>
              
              <View style={[styles.statRow, { justifyContent: 'space-between', marginBottom: 10 }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 15, marginLeft: 0 }]}>Копійки (Загальний баланс)</Text>
                <CustomSwitch
                  value={showDecimalsBalance}
                  onValueChange={setShowDecimalsBalance}
                  isDark={isDark}
                  colors={colors}
                />
              </View>
              
              <View style={[styles.statRow, { justifyContent: 'space-between', marginBottom: 10 }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 15, marginLeft: 0 }]}>Копійки (Статистика боргів)</Text>
                <CustomSwitch
                  value={showDecimalsStatistics}
                  onValueChange={setShowDecimalsStatistics}
                  isDark={isDark}
                  colors={colors}
                />
              </View>

              <View style={[styles.statRow, { justifyContent: 'space-between', marginBottom: 10 }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 15, marginLeft: 0 }]}>Авто-перенос сум в статистиці</Text>
                <CustomSwitch
                  value={wrapStatisticsText}
                  onValueChange={setWrapStatisticsText}
                  isDark={isDark}
                  colors={colors}
                />
              </View>

              <View style={[styles.statRow, { justifyContent: 'space-between', marginBottom: 0 }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 15, marginLeft: 0 }]}>Символ валюти (грн / ₴)</Text>
                <CustomSwitch
                  value={currencySymbol === '₴'}
                  onValueChange={(val) => setCurrencySymbol(val ? '₴' : 'грн')}
                  isDark={isDark}
                  colors={colors}
                />
              </View>
            </View>

            <View style={[styles.statsContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[styles.statsHeader, { color: colors.text }]}>Стан Бази Даних</Text>
            
            <View style={styles.statRow}>
              <MaterialIcons name={isOnline ? "wifi" : "wifi-off"} size={20} color={isOnline ? "#4CAF50" : "#F44336"} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Мережа:</Text>
              <Text style={[styles.statValue, { color: isOnline ? "#4CAF50" : "#F44336" }]}>
                {isOnline ? "Онлайн" : "Офлайн"}
              </Text>
            </View>

            <View style={styles.statRow}>
              <MaterialIcons name="storage" size={20} color="#2196F3" />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Завантажено записів:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalRecords}</Text>
            </View>
            
            <View style={styles.statRow}>
              <MaterialIcons name="cloud-download" size={20} color="#00BCD4" />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Джерело даних:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{getDataSourceText()}</Text>
            </View>

            <View style={styles.statRow}>
              <MaterialIcons name="update" size={20} color="#FF9800" />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Останнє оновлення:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {lastUpdate ? `${lastUpdate.toLocaleDateString('uk-UA')} ${lastUpdate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Ніколи'}
              </Text>
            </View>
          </View>

            <TouchableOpacity 
              style={[styles.syncButton, isSyncing && styles.syncingButton]} 
              onPress={handleFullSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons name="sync" size={24} color="white" />
                  <Text style={styles.syncButtonText}>Повна синхронізація</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Modal visible={isColorPickerVisible} animationType="slide" transparent={true}>
            <View style={styles.colorPickerOverlay}>
                <View style={[styles.colorPickerModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.statsHeader, { color: colors.text, marginBottom: 20 }]}>Виберіть колір</Text>
                    <View style={{ height: 300, width: '100%' }}>
                        <ColorPicker
                            color={accentColor === 'default' ? '#000000' : accentColor}
                            onColorChangeComplete={(color) => setAccentColor(color)}
                            thumbSize={30}
                            sliderSize={30}
                            noSnap={true}
                            row={false}
                        />
                    </View>
                    <TouchableOpacity style={[styles.syncButton, { backgroundColor: colors.buttonBg, marginTop: 20 }]} onPress={() => setColorPickerVisible(false)}>
                        <Text style={styles.syncButtonText}>Готово</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      </View>
    </Modal>
  );
};

export default SettingsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '40%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'MontserratBold',
  },
  closeButton: {
    padding: 5,
  },
  statsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statsHeader: {
    fontSize: 16,
    fontFamily: 'MontserratBold',
    color: '#333',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#555',
    marginLeft: 8,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'MontserratBold',
    color: '#222',
  },
  syncButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  syncingButton: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: 'white',
    fontFamily: 'MontserratBold',
    fontSize: 16,
    marginLeft: 10,
  },
  themeContainer: {
    marginBottom: 20,
  },
  themeButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  themeBtnText: {
    fontFamily: 'Montserrat',
    fontSize: 14,
  },
  settingSubLabel: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#757575',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
    gap: 8,
  },
  resetButtonText: {
    color: '#F44336',
    fontFamily: 'MontserratBold',
    fontSize: 16,
  },
  customColorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  customColorInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 120,
    justifyContent: 'center',
  },
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  colorPickerModal: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
});
