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
