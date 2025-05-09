export interface User {
    id: string;
    name: string;
    email: string;
    secondName?: string;
    avatar?: string;
}

export interface Debt {
    id: string;
    deptId: string;
    fromUserId: string;
    toUserId: string;
    text: string;
    amount: number;
    createdAt: string;
}

export interface DebtItem {
    id: string;
    text: string;
    num: number;
}

export interface Statistics {
    incomingDebts: number;
    outgoingDebts: number;
    activeDebtsCount: number;
    totalBalance: number;
}