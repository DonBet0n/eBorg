import { appStyles, scaleRadius, setStyleScales } from '../appStyles';

afterEach(() => setStyleScales(1, 1));

describe('scaleRadius', () => {
  it('множить звичайний радіус', () => {
    expect(scaleRadius(20, 0.5)).toBe(10);
    expect(scaleRadius(20, 0)).toBe(0);
    expect(scaleRadius(12, 1.5)).toBe(18);
  });

  it('не чіпає дрібні декоративні радіуси', () => {
    expect(scaleRadius(2, 0)).toBe(2);
  });

  it('пігулка лишається пігулкою на стандарті й більше, а менше — стає звичайним радіусом', () => {
    expect(scaleRadius(999, 1)).toBe(999);
    expect(scaleRadius(999, 1.5)).toBe(999);
    expect(scaleRadius(999, 0.5)).toBe(12);
  });
});

describe('appStyles', () => {
  const styles = appStyles({
    card: { borderRadius: 20, padding: 8 },
    circle: { width: 40, height: 40, borderRadius: 20 },
    text: { fontSize: 16, lineHeight: 22, letterSpacing: 0.3 },
  });

  it('віддає радіуси за поточним множником «Заокруглення»', () => {
    expect(styles.card.borderRadius).toBe(20);
    setStyleScales(0.5, 1);
    expect(styles.card.borderRadius).toBe(10);
    expect(styles.card.padding).toBe(8);
  });

  it('коло лишається колом', () => {
    setStyleScales(0, 1);
    expect(styles.circle.borderRadius).toBe(20);
  });

  it('шрифт і висота рядка враховують «Розмір тексту», решта — ні', () => {
    setStyleScales(1, 1.2);
    expect(styles.text.fontSize).toBe(19);
    expect(styles.text.lineHeight).toBe(26.5);
    expect(styles.text.letterSpacing).toBe(0.3);
    expect(styles.card.borderRadius).toBe(20);
  });

  it('обидва множники разом', () => {
    setStyleScales(0.5, 0.8);
    expect(styles.card.borderRadius).toBe(10);
    expect(styles.text.fontSize).toBe(13);
  });
});
