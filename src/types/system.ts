// Role Symbols
export const RoleSymbols = {
    ADMIN: Symbol('ADMIN'),
    USER: Symbol('USER'),
    GUEST: Symbol('GUEST'),
};

// System Types
export type User = {
    id: string;
    name: string;
    role: keyof typeof RoleSymbols;
};

export type Message = {
    sender: User;
    content: string;
    timestamp: Date;
};

export type ChatRoom = {
    id: string;
    participants: User[];
    messages: Message[];
};