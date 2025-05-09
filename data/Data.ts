import { User, Debt, GroupDebt } from '../types/debt';

export const Users: User[] = [
    { id: 'user1', name: 'Ви', email: 'test@gmail'},
    { id: 'user2', name: 'Іван', email: 'test@gmail' },
    { id: 'user3', name: 'Марія', email: 'test@gmail' },
    { id: 'user4', name: 'Петро', email: 'test@gmail' },
    { id: 'user5', name: 'Олена', email: 'test@gmail' }
];

export const Debts: Debt[] = [
    {
        id: '1',
        fromUserId: 'user1',
        toUserId: 'user2',
        fromUser: 'Іван',
        amount: 350,
        items: [
            { id: '1', text: 'Обід', num: '200' },
            { id: '2', text: 'Таксі', num: '150' }
        ],
        createdAt: '2024-01-20T12:00:00Z',
        isSettled: false
    },
    {
        id: '2',
        fromUserId: 'user2',
        toUserId: 'user1',
        fromUser: 'Іван',
        amount: 350,
        items: [
            { id: '1', text: 'Обід', num: '200' },
            { id: '2', text: 'Таксі', num: '150' }
        ],
        createdAt: '2024-01-20T12:00:00Z',
        isSettled: false
    },
    // ...додаткові борги
];

export const mockGroupDebts: GroupDebt[] = [
    {
        id: '1',
        items: [
            { id: '1', text: 'Оренда квартири', num: '6000' },
            { id: '2', text: 'Комунальні', num: '1500' }
        ],
        userDebts: [
            { userId: 'user2', amount: 2500 },
            { userId: 'user3', amount: 2500 },
            { userId: 'user4', amount: 2500 }
        ],
        receiverId: 'user1',
        createdAt: '2024-01-15T10:00:00Z',
        isSettled: false
    },
    // ...додаткові групові борги
];
