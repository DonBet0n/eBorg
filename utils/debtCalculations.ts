import { Statistics } from '../types/debt';

// Нерозривний пробіл: число, знак і валюта не розриваються переносом рядка
export const NBSP = String.fromCharCode(0xa0);

export const calculateDebts = (
  debts: { fromUserId: string; toUserId: string; amount: number }[],
  currentUserId: string,
): Statistics => {
  const statistics = debts.reduce((acc, debt) => {
    if (!debt || !debt.amount) return acc;

    if (debt.toUserId === currentUserId) {
      acc.incomingDebts += Number(debt.amount);
      acc.activeDebtsCount++;
    } else if (debt.fromUserId === currentUserId) {
      acc.outgoingDebts += Number(debt.amount);
      acc.activeDebtsCount++;
    }

    return acc;
  }, {
    incomingDebts: 0,
    outgoingDebts: 0,
    activeDebtsCount: 0,
    totalBalance: 0
  });

  statistics.totalBalance = statistics.incomingDebts - statistics.outgoingDebts;
  return statistics;
};

// Розділяє тисячі нерозривним пробілом: 12450.00 → 12 450.00
export const groupThousands = (value: string): string => {
  const [whole, fraction] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return fraction !== undefined ? `${grouped}.${fraction}` : grouped;
};

// Сума для показу: дві цифри після крапки і розділені тисячі — 12 450.00
export const formatAmount = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) return '0.00';
  return groupThousands(Number(amount).toFixed(2));
};

// Ділить суму на частини без втрати копійок: 100 на 3 → 33.34, 33.33, 33.33. Більші частини йдуть першими.
export const splitAmount = (amount: number, parts: number): number[] => {
  if (parts <= 0) return [];
  const kopecks = Math.round(amount * 100);
  const base = Math.floor(kopecks / parts);
  const remainder = kopecks - base * parts;
  return Array.from({ length: parts }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
};

// Опис, який отримують записи оплати. Старі записи (без поля `type`) розпізнаються саме за ним.
// Борг — це щонайменше копійка: нуль, мінус, NaN чи сума, що округлюється до 0.00, не записуються
export const isValidDebtAmount = (amount: number): boolean =>
  Number.isFinite(amount) && Math.round(amount * 100) >= 1;

export const PAYMENT_TEXT = 'Оплата боргу';
export const PAYMENT_TYPE = 'payment';

export const isPaymentRecord = (record: { type?: string; text?: string }): boolean =>
  record.type === PAYMENT_TYPE || record.text?.trim() === PAYMENT_TEXT;

// Українські відмінки: pluralize(1, 'транзакція', 'транзакції', 'транзакцій')
export const pluralize = (count: number, one: string, few: string, many: string): string => {
  const n = Math.abs(count) % 100;
  const lastDigit = n % 10;
  if (n > 10 && n < 20) return many;
  if (lastDigit === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
};
