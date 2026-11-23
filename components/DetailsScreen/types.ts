import { Transaction } from '../../types/debt';
import { startOfDay } from '../../utils/date';

// Записи з людиною, згруповані в «чеки» за днем; кожна оплата — окремий запис
export interface GroupedTransaction {
    date: Date;
    items: Transaction[];
    totalAmount: number;
    isPayment: boolean;
}

export const groupByDate = (items: Transaction[], currentUserId?: string): GroupedTransaction[] => {
    const groups: GroupedTransaction[] = [];
    // День → його чек: один прохід замість пошуку по всіх групах для кожного запису
    const byDay = new Map<number, GroupedTransaction>();

    items.forEach(item => {
        if (!item) return;

        if (item.isPayment) {
            groups.push({ date: item.date, items: [item], totalAmount: item.amount, isPayment: true });
            return;
        }

        const day = startOfDay(item.date);
        const amount = item.fromUserId === currentUserId ? -item.amount : item.amount;
        const existing = byDay.get(day);

        if (existing) {
            existing.items.push(item);
            existing.totalAmount += amount;
        } else {
            const group = { date: item.date, items: [item], totalAmount: amount, isPayment: false };
            byDay.set(day, group);
            groups.push(group);
        }
    });

    // Найновіші спочатку
    return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
