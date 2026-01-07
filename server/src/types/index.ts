import { Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen: Date;
    rooms: string[];
    comparePassword(password: string): Promise<boolean>;
}

export interface IRoom extends Document {
    name: string;
    description?: string;
    isPrivate: boolean;
    members: string[];
    admins: string[];
    createdBy: string;
    lastActivity: Date;
}

export interface IMessage extends Document {
    content: string;
    sender: string;
    room: string;
    type: 'text' | 'system';
    isEdited: boolean;
    editedAt?: Date;
}

export interface WebSocketMessage {
    type: 'authenticated' | 'room_list' | 'room_joined' | 'new_message' | 'user_joined' | 'user_left' | 'error' | 'success';
    data: any;
    timestamp: string;
}

export interface AuthenticatedSocket {
    socketId: string;
    userId: string;
    username: string;
    token: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface CreateRoomRequest {
    name: string;
    description?: string;
    isPrivate?: boolean;
}

export interface JoinRoomRequest {
    roomId: string;
}

export interface SendMessageRequest {
    roomId: string;
    content: string;
}