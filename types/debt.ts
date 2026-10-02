export interface User {
    id: string;
    name: string;
    email: string;
    secondName?: string;
    avatar?: string;
    expoPushToken?: string;
}

export interface DebtItem {
    id: string;
    text: string;
    num: string; 
    multiplier?: number;
    baseNum?: string;
}

// Used for fetched data in Context
export interface Transaction {
    id: string;
    text: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    date: Date;
    isPayment: boolean;
}

// Used for grouped debts in Context
export interface DebtGroup {
    userId: string;
    userName: string;
    userAvatar?: string;
    items: Transaction[];
    totalAmount: number;
}

export interface Statistics {
    incomingDebts: number;
    outgoingDebts: number;
    activeDebtsCount: number;
    totalBalance: number;
}