import { Statistics } from '../types/debt';

export const calculateDebts = (debts: any[], currentUserId: string): Statistics => {
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

export const formatAmount = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) return '0.00';
  return Number(amount).toFixed(2);
};

export const formatCurrency = (amount: number): string => {
  return formatAmount(amount).toString();
};

// Опис, який отримують записи оплати. Старі записи (без поля `type`) розпізнаються саме за ним.
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
