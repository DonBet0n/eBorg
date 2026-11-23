import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Switch } from 'react-native';
import Constants from 'expo-constants';
import Icon, { IconName } from '@/components/ui/Icon';
import Slider from '@react-native-community/slider';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAppTheme, ThemeType } from '../contexts/ThemeContext';
import { Colors, ThemeColors } from '../constants/Colors';
import BottomSheet from './ui/BottomSheet';
import { formatClock, formatDayLabel } from '../utils/date';
import { appStyles, scaleRadius, CORNER_SCALE_MIN, CORNER_SCALE_MAX } from '@/utils/appStyles';
import { appAlert } from '@/components/ui/AppDialog';
import { BUTTON } from '@/constants/Theme';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Позиції повзунка розміру тексту: він прилипає лише до них
const TEXT_SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.3];

// Кольори стану: увімкнений перемикач, є/немає з'єднання, скидання
const TINTS = {
  on: '#30D158',
  danger: '#FF453A',
};

const THEMES: { value: ThemeType; label: string }[] = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
];

// Мініатюра для повзунка заокруглення: картка боргу, поле вводу і кнопка з потрібними кутами
const CornerPreview = ({ scale, colors, surface }: { scale: number; colors: ThemeColors; surface: string }) => (
  <View style={[styles.cornerPreview, { backgroundColor: colors.background, borderRadius: scaleRadius(20, scale) }]}>
    <View style={styles.cornerPreviewTop}>
      <View style={[styles.cornerAvatar, { backgroundColor: surface }]} />
      <View style={styles.cornerLines}>
        <View style={[styles.cornerLine, styles.cornerLineWide, { backgroundColor: colors.text }]} />
        <View style={[styles.cornerLine, { backgroundColor: colors.border }]} />
      </View>
      <Text style={[styles.cornerAmount, { color: colors.text }]}>250 ₴</Text>
    </View>
    <View style={[styles.cornerField, { backgroundColor: surface, borderColor: colors.border, borderRadius: scaleRadius(12, scale) }]}>
      <Text style={[styles.cornerFieldText, { color: colors.textSecondary }]}>Опис</Text>
    </View>
    <View style={[styles.cornerButton, { backgroundColor: colors.buttonBg, borderRadius: scaleRadius(26, scale) }]}>
      <Text style={[styles.cornerButtonText, { color: colors.buttonText }]}>Повернути борг</Text>
    </View>
  </View>
);

const nearestScaleIndex = (scale: number) =>
  TEXT_SCALES.reduce((best, value, index) => Math.abs(value - scale) < Math.abs(TEXT_SCALES[best] - scale) ? index : best, 0);

// Усі плитки-іконки однакові: кольором виділяється лише стан, а не розділ
const IconTile = ({ icon, colors }: { icon: IconName; colors: ThemeColors }) => (
  <View style={[styles.iconTile, { backgroundColor: colors.background }]}>
    <Icon name={icon} size={18} color={colors.icon} />
  </View>
);

// Мініатюра екрана в потрібній темі: шапка, рядок суми і два рядки списку
const ThemeMockup = ({ palette }: { palette: ThemeColors }) => (
  <View style={[styles.mockupPane, { backgroundColor: palette.background }]}>
    <View style={[styles.mockupDot, { backgroundColor: palette.cardAlt }]} />
    <View style={[styles.mockupBar, styles.mockupBarWide, { backgroundColor: palette.text }]} />
    <View style={[styles.mockupBar, { backgroundColor: palette.cardAlt }]} />
    <View style={[styles.mockupBar, { backgroundColor: palette.cardAlt }]} />
  </View>
);

// Перемикач з кількох взаємовиключних варіантів
function SegmentedControl<T extends string>({ options, value, onChange, colors }: { options: { value: T, label: string }[], value: T, onChange: (v: T) => void, colors: ThemeColors }) {
  return (
    <View style={[styles.segmented, { backgroundColor: colors.background }]}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, selected && { backgroundColor: colors.text }]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[selected ? styles.segmentTextSelected : styles.segmentText, { color: selected ? colors.background : colors.textSecondary }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { fullSync, isOnline, lastUpdate } = useFirebase();
  const {
    theme, setTheme, colors, isDark,
    textScale, setTextScale,
    showDecimalsBalance, setShowDecimalsBalance,
    showDecimalsStatistics, setShowDecimalsStatistics,
    currencySymbol, setCurrencySymbol,
    cornerScale, setCornerScale,
    resetToDefaults
  } = useAppTheme();
  const [isSyncing, setIsSyncing] = useState(false);
  // Повзунку віддаємо лише збережену позицію: якщо оновлювати її під час руху, він смикається
  const scaleIndex = nearestScaleIndex(textScale);
  const [draftIndex, setDraftIndex] = useState(scaleIndex);
  const previewScale = TEXT_SCALES[draftIndex];

  useEffect(() => {
    setDraftIndex(scaleIndex);
  }, [scaleIndex]);

  // Так само і для заокруглення: прев'ю міняється під час руху, а весь застосунок — коли відпустили
  const [draftCorner, setDraftCorner] = useState(cornerScale);
  useEffect(() => {
    setDraftCorner(cornerScale);
  }, [cornerScale]);

  const surface = isDark ? colors.card : colors.cardAlt;
  const divider = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border };
  // Один перемикач керує копійками і в балансі, і в сумах записів
  const showDecimals = showDecimalsBalance || showDecimalsStatistics;
  const setShowDecimals = (value: boolean) => {
    setShowDecimalsBalance(value);
    setShowDecimalsStatistics(value);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await fullSync();
    setIsSyncing(false);
  };

  const handleReset = () => {
    appAlert(
      'Скинути налаштування?',
      'Тема, розмір тексту, заокруглення та формат сум повернуться до стандартних. Борги не зміняться.',
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Скинути', style: 'destructive', onPress: resetToDefaults },
      ]
    );
  };

  const syncStatus = !isOnline
    ? 'Немає з\'єднання'
    : lastUpdate
      ? `Оновлено ${formatDayLabel(lastUpdate).replace(/^(Сьогодні|Учора)$/, word => word.toLowerCase())} о ${formatClock(lastUpdate)}`
      : 'Ще не оновлювалось';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Налаштування">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Живий попередній перегляд: одразу видно, як зміни вплинуть на суми */}
        <View style={[styles.preview, { backgroundColor: surface }]}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Так виглядатиме баланс</Text>
          <Text
            style={[styles.previewAmount, { color: colors.text, fontSize: 40 * previewScale, lineHeight: 48 * previewScale }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {showDecimals ? '1 250.50' : '1 250'}
            <Text style={[styles.previewCurrency, { fontSize: 20 * previewScale }]}> {currencySymbol}</Text>
          </Text>
          <View style={[styles.previewChip, { backgroundColor: colors.positiveBg }]}>
            <Text style={[styles.previewChipText, { color: colors.positiveText, fontSize: 13 * previewScale }]}>
              + {showDecimals ? '120.00' : '120'} {currencySymbol} за сьогодні
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Тема</Text>
        <View style={styles.themeRow}>
          {THEMES.map(option => {
            const selected = theme === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.themeOption}
                onPress={() => setTheme(option.value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Тема: ${option.label}`}
              >
                <View style={[styles.mockup, { borderColor: selected ? colors.text : colors.border, borderWidth: selected ? 2 : 1 }]}>
                  {/* «Авто» — навпіл світла і темна */}
                  {option.value !== 'dark' && <ThemeMockup palette={Colors.light} />}
                  {option.value !== 'light' && <ThemeMockup palette={Colors.dark} />}
                  {selected && (
                    <View style={[styles.mockupCheck, { backgroundColor: colors.text }]}>
                      <Icon name="check" size={12} color={colors.background} />
                    </View>
                  )}
                </View>
                <Text style={[selected ? styles.themeLabelSelected : styles.themeLabel, { color: selected ? colors.text : colors.textSecondary }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Текст</Text>
        <View style={[styles.card, styles.block, { backgroundColor: surface }]}>
          <View style={styles.blockHeader}>
            <IconTile icon="text-size" colors={colors} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Розмір тексту</Text>
            <View style={[styles.valueChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.valueChipText, { color: colors.text }]}>{Math.round(previewScale * 100)}%</Text>
            </View>
          </View>
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLetterSmall, { color: colors.textSecondary }]}>А</Text>
            <View style={styles.sliderTrack}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={TEXT_SCALES.length - 1}
                step={1}
                value={scaleIndex}
                onValueChange={setDraftIndex}
                onSlidingComplete={index => setTextScale(TEXT_SCALES[Math.round(index)])}
                minimumTrackTintColor={colors.text}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.text}
                accessibilityLabel="Розмір тексту"
              />
              <View style={styles.ticks} pointerEvents="none">
                {TEXT_SCALES.map((scale, index) => (
                  <View
                    key={scale}
                    style={[styles.tick, { backgroundColor: index <= draftIndex ? colors.text : colors.border }]}
                  />
                ))}
              </View>
            </View>
            <Text style={[styles.sliderLetterLarge, { color: colors.textSecondary }]}>А</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Заокруглення</Text>
        <View style={[styles.card, styles.block, { backgroundColor: surface }]}>
          <View style={styles.blockHeader}>
            <IconTile icon="rounded-corner" colors={colors} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Кути елементів</Text>
            <View style={[styles.valueChip, { backgroundColor: colors.background }]}>
              <Text style={[styles.valueChipText, { color: colors.text }]}>{Math.round(draftCorner * 100)}%</Text>
            </View>
          </View>
          <CornerPreview scale={draftCorner} colors={colors} surface={surface} />
          <View style={styles.sliderRow}>
            <View style={[styles.cornerIcon, { borderColor: colors.textSecondary, borderRadius: 0 }]} />
            <View style={styles.sliderTrack}>
              <Slider
                style={styles.slider}
                minimumValue={CORNER_SCALE_MIN}
                maximumValue={CORNER_SCALE_MAX}
                step={0.1}
                value={cornerScale}
                onValueChange={value => setDraftCorner(Math.round(value * 10) / 10)}
                onSlidingComplete={value => setCornerScale(Math.round(value * 10) / 10)}
                minimumTrackTintColor={colors.text}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.text}
                accessibilityLabel="Заокруглення кутів"
              />
            </View>
            <View style={[styles.cornerIcon, { borderColor: colors.textSecondary, borderRadius: 7 }]} />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Суми</Text>
        <View style={[styles.card, { backgroundColor: surface }]}>
          <View style={styles.row}>
            <IconTile icon="coins" colors={colors} />
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Копійки</Text>
              <Text style={[styles.rowHint, { color: colors.textSecondary }]}>У балансі та в записах</Text>
            </View>
            <Switch
              value={showDecimals}
              onValueChange={setShowDecimals}
              trackColor={{ false: colors.border, true: TINTS.on }}
              thumbColor="#fff"
              accessibilityLabel="Показувати копійки"
            />
          </View>

          <View style={[styles.row, divider]}>
            <IconTile icon="currency" colors={colors} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>Валюта</Text>
            <View style={styles.currencyControl}>
              <SegmentedControl
                options={[
                  { value: 'грн', label: 'грн' },
                  { value: '₴', label: '₴' },
                ]}
                value={currencySymbol === '₴' ? '₴' : 'грн'}
                onChange={setCurrencySymbol}
                colors={colors}
              />
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Дані</Text>
        <View style={[styles.card, { backgroundColor: surface }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleSync}
            disabled={isSyncing || !isOnline}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSyncing || !isOnline, busy: isSyncing }}
          >
            <IconTile icon={isOnline ? 'sync' : 'wifi-off'} colors={colors} />
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Оновити з сервера</Text>
              <View style={styles.statusLine}>
                <View style={[styles.statusDot, { backgroundColor: isOnline ? TINTS.on : TINTS.danger }]} />
                <Text style={[styles.rowHint, { color: colors.textSecondary }]} numberOfLines={1}>{syncStatus}</Text>
              </View>
            </View>
            {isSyncing
              ? <ActivityIndicator color={colors.iconSecondary} size="small" />
              : <Icon name="chevron-right" size={20} color={colors.iconSecondary} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: TINTS.danger + '1A' }]}
          onPress={handleReset}
          accessibilityRole="button"
        >
          <Icon name="refresh" size={18} color={colors.negativeText} />
          <Text style={[styles.resetText, { color: colors.negativeText }]}>Скинути налаштування</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          eBorg · версія {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </BottomSheet>
  );
};

export default SettingsModal;

const styles = appStyles({
  scrollContent: {
    paddingBottom: 8,
  },
  preview: {
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 13,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  previewAmount: {
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  previewCurrency: {
    fontFamily: 'NunitoSansBold',
  },
  previewChip: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  previewChipText: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 18,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
  },
  mockup: {
    width: '100%',
    height: 92,
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  mockupPane: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 10,
    gap: 6,
  },
  mockupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 2,
  },
  mockupBar: {
    height: 6,
    borderRadius: 3,
  },
  mockupBarWide: {
    width: '70%',
    height: 8,
    borderRadius: 4,
  },
  mockupCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  themeLabelSelected: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  block: {
    paddingVertical: 16,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  rowHint: {
    fontSize: 13,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginTop: 2,
    flexShrink: 1,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 2,
  },
  valueChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  valueChipText: {
    fontSize: 13,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  segmentText: {
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    fontSize: 14,
  },
  segmentTextSelected: {
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    fontSize: 14,
  },
  currencyControl: {
    width: 120,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderTrack: {
    flex: 1,
  },
  slider: {
    height: 44,
  },
  // Бічний відступ дорівнює половині бігунка, щоб крапки стояли під його позиціями
  ticks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: -10,
  },
  tick: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  sliderLetterSmall: {
    fontFamily: 'NunitoSansBold',
    fontSize: 13,
    width: 20,
    textAlign: 'center',
  },
  sliderLetterLarge: {
    fontFamily: 'NunitoSansBold',
    fontSize: 22,
    width: 20,
    textAlign: 'center',
  },
  cornerPreview: {
    padding: 12,
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  cornerPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cornerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  cornerLines: {
    flex: 1,
    gap: 6,
  },
  cornerLine: {
    width: '40%',
    height: 6,
    borderRadius: 3,
  },
  cornerLineWide: {
    width: '65%',
    height: 8,
    borderRadius: 4,
  },
  cornerAmount: {
    fontSize: 16,
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
  },
  cornerField: {
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cornerFieldText: {
    fontSize: 14,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  cornerButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerButtonText: {
    fontSize: 14,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  // Значки по краях повзунка: прямий і заокруглений кут
  cornerIcon: {
    width: 18,
    height: 18,
    borderWidth: 2,
    marginHorizontal: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: BUTTON.height,
    borderRadius: BUTTON.radius,
    marginTop: 24,
  },
  resetText: {
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  version: {
    fontSize: 12,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 16,
  },
});
