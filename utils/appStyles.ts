import { StyleSheet } from 'react-native';

// Стилі застосунку з урахуванням двох налаштувань:
// «Заокруглення» — множник для радіусів кутів, «Розмір тексту» — множник для шрифтів.

// «Заокруглення»: 1 — стандартний вигляд, 0 — прямі кути, 1.5 — максимально круглі.
export const CORNER_SCALE_MIN = 0;
export const CORNER_SCALE_MAX = 1.5;
export const CORNER_SCALE_DEFAULT = 1;

const RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
] as const;

const TEXT_KEYS = ['fontSize', 'lineHeight'] as const;

// Дрібні радіуси (смужка шторки, крапки, поділки) — це форма елемента, а не стиль кутів
const DECORATIVE_MAX = 4;
// 999 означає «пігулка». Коли кути зменшують, рахуємо її як звичайну кнопку з таким радіусом
const PILL = 999;
const PILL_BASE = 24;

// Поточні множники. Їх ставить AppThemeProvider під час рендеру, до того як рендеряться екрани
let cornerScale = CORNER_SCALE_DEFAULT;
let textScale = 1;
export const setStyleScales = (corner: number, text: number) => {
  cornerScale = corner;
  textScale = text;
};

export const scaleRadius = (value: number, scale: number = cornerScale): number => {
  if (scale === 1 || value <= DECORATIVE_MAX) return value;
  if (value >= PILL) return scale > 1 ? value : PILL_BASE * scale;
  return Math.round(value * scale * 2) / 2;
};

const scaleText = (value: number, scale: number) => Math.round(value * scale * 2) / 2;

type AnyStyle = Record<string, any>;

// Коло (аватар, кругла кнопка) лишається колом за будь-якого налаштування
const isCircle = (style: AnyStyle) =>
  typeof style.width === 'number' &&
  style.width === style.height &&
  typeof style.borderRadius === 'number' &&
  style.borderRadius * 2 >= style.width;

const scaleStyle = (style: AnyStyle, corner: number, text: number): AnyStyle => {
  if (!style || typeof style !== 'object') return style;
  let next: AnyStyle | null = null;
  const set = (key: string, value: number) => {
    next = next ?? { ...style };
    next[key] = value;
  };

  if (corner !== 1 && !isCircle(style)) {
    for (const key of RADIUS_KEYS) {
      const value = style[key];
      if (typeof value !== 'number') continue;
      const scaled = scaleRadius(value, corner);
      if (scaled !== value) set(key, scaled);
    }
  }
  if (text !== 1) {
    for (const key of TEXT_KEYS) {
      const value = style[key];
      if (typeof value === 'number') set(key, scaleText(value, text));
    }
  }
  return next ?? style;
};

// Замінник StyleSheet.create: ті самі стилі, але радіуси й шрифти враховують налаштування.
// Значення читаються під час рендеру, тож після зміни налаштувань оновлюються всі екрани,
// що перерендерюються через тему (а це майже всі — вони беруть із теми кольори).
// Розмір, переданий прямо в розмітці (style={{ fontSize: 16 * textScale }}), має сам враховувати множник
export function appStyles<T extends StyleSheet.NamedStyles<T>>(styles: T & StyleSheet.NamedStyles<any>): T {
  const base = StyleSheet.create(styles) as unknown as Record<string, AnyStyle>;
  const cache = new Map<string, Record<string, AnyStyle>>();

  const scaledFor = (corner: number, text: number) => {
    const cacheKey = `${corner}|${text}`;
    let scaled = cache.get(cacheKey);
    if (!scaled) {
      scaled = {};
      for (const key of Object.keys(base)) scaled[key] = scaleStyle(base[key], corner, text);
      cache.set(cacheKey, scaled);
    }
    return scaled;
  };

  const result = {} as Record<string, AnyStyle>;
  for (const key of Object.keys(base)) {
    Object.defineProperty(result, key, {
      enumerable: true,
      get: () => (cornerScale === 1 && textScale === 1 ? base[key] : scaledFor(cornerScale, textScale)[key]),
    });
  }
  return result as unknown as T;
}
