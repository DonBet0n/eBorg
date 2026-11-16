import { splitAmount } from '../debtCalculations';

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
