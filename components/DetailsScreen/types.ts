import { Transaction } from '../../types/debt';

// Записи з людиною, згруповані в «чеки» за днем; кожна оплата — окремий запис
export interface GroupedTransaction {
    date: Date;
    items: Transaction[];
    totalAmount: number;
    isPayment: boolean;
}

export const groupByDate = (items: Transaction[], currentUserId?: string): GroupedTransaction[] => {
    const grouped = items.reduce((acc: GroupedTransaction[], item) => {
        if (!item) return acc;

        if (item.isPayment) {
            acc.push({ date: item.date, items: [item], totalAmount: item.amount, isPayment: true });
            return acc;
        }

        const dateKey = new Date(item.date).toLocaleDateString();
        const existing = acc.find(group => !group.isPayment && new Date(group.date).toLocaleDateString() === dateKey);
        const amount = item.fromUserId === currentUserId ? -item.amount : item.amount;

        if (existing) {
            existing.items.push(item);
            existing.totalAmount += amount;
        } else {
            acc.push({ date: item.date, items: [item], totalAmount: amount, isPayment: false });
        }
        return acc;
    }, []);

    // Найновіші спочатку
    return grouped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
