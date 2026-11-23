import { formatAmount, isValidDebtAmount, splitAmount } from '../debtCalculations';

const sum = (values: number[]) => Math.round(values.reduce((acc, value) => acc + value * 100, 0));

describe('splitAmount', () => {
  it('ділить 100 на трьох без втрати копійки', () => {
    expect(splitAmount(100, 3)).toEqual([33.34, 33.33, 33.33]);
  });

  it('ділить 10 на трьох без втрати копійки', () => {
    expect(splitAmount(10, 3)).toEqual([3.34, 3.33, 3.33]);
  });

  it('залишає суму незмінною для різних дробових значень', () => {
    [0.01, 0.1, 19.99, 370.5, 1234.56].forEach(amount => {
      [1, 2, 3, 7].forEach(parts => {
        expect(sum(splitAmount(amount, parts))).toBe(Math.round(amount * 100));
      });
    });
  });

  it('не ламається, якщо учасників немає', () => {
    expect(splitAmount(100, 0)).toEqual([]);
  });
});

describe('formatAmount', () => {
  const NBSP = ' ';

  it('розділяє тисячі нерозривним пробілом', () => {
    expect(formatAmount(12450)).toBe(`12${NBSP}450.00`);
    expect(formatAmount(1234567.5)).toBe(`1${NBSP}234${NBSP}567.50`);
  });

  it('малі й від\'ємні суми', () => {
    expect(formatAmount(5)).toBe('5.00');
    expect(formatAmount(-1250.5)).toBe(`-1${NBSP}250.50`);
  });

  it('порожнє значення — нуль', () => {
    expect(formatAmount(undefined)).toBe('0.00');
    expect(formatAmount(NaN)).toBe('0.00');
  });
});

describe('isValidDebtAmount', () => {
  it('приймає суму від копійки', () => {
    expect(isValidDebtAmount(0.01)).toBe(true);
    expect(isValidDebtAmount(250)).toBe(true);
  });

  it('відкидає нуль, мінус і те, що округлюється до нуля', () => {
    expect(isValidDebtAmount(0)).toBe(false);
    expect(isValidDebtAmount(-5)).toBe(false);
    expect(isValidDebtAmount(0.004)).toBe(false);
  });

  it('відкидає не-числа', () => {
    expect(isValidDebtAmount(NaN)).toBe(false);
    expect(isValidDebtAmount(Infinity)).toBe(false);
  });
});
