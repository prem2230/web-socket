import WebSocket from 'ws';
import { WebSocketMessage, AuthenticatedSocket } from '../types';
import { logger } from '../utils/logger';

export class WebSocketService {
    private static clients = new Map<string, WebSocket>();
    private static authenticatedSockets = new Map<string, AuthenticatedSocket>();
    private static roomSockets = new Map<string, Set<string>>(); // roomId -> Set<socketId>

    static addClient(socketId: string, ws: WebSocket): void {
        this.clients.set(socketId, ws);
        logger.info(`WebSocket client added: ${socketId}`);
    }

    static removeClient(socketId: string): void {
        this.clients.delete(socketId);
        this.authenticatedSockets.delete(socketId);

        // Remove from all rooms
        this.roomSockets.forEach((sockets, roomId) => {
            sockets.delete(socketId);
            if (sockets.size === 0) {
                this.roomSockets.delete(roomId);
            }
        });

        logger.info(`WebSocket client removed: ${socketId}`);
    }

    static authenticateSocket(socketId: string, authData: AuthenticatedSocket): void {
        this.authenticatedSockets.set(socketId, authData);
        logger.info(`Socket authenticated: ${socketId} for user ${authData.username}`);
    }

    static isAuthenticated(socketId: string): boolean {
        return this.authenticatedSockets.has(socketId);
    }

    static getAuthenticatedUser(socketId: string): AuthenticatedSocket | undefined {
        return this.authenticatedSockets.get(socketId);
    }

    static addToRoom(roomId: string, socketId: string): void {
        if (!this.roomSockets.has(roomId)) {
            this.roomSockets.set(roomId, new Set());
        }
        this.roomSockets.get(roomId)!.add(socketId);

        // Debug logging
        const roomSockets = this.getRoomSockets(roomId);
        logger.info(`Socket ${socketId} joined room ${roomId}. Room now has ${roomSockets.length} sockets: [${roomSockets.join(', ')}]`);
    }

    static removeFromRoom(roomId: string, socketId: string): void {
        const sockets = this.roomSockets.get(roomId);
        if (sockets) {
            sockets.delete(socketId);
            if (sockets.size === 0) {
                this.roomSockets.delete(roomId);
            }
            logger.info(`Socket ${socketId} left room ${roomId}. Room now has ${sockets.size} sockets`);
        }
    }

    static getRoomSockets(roomId: string): string[] {
        const sockets = this.roomSockets.get(roomId);
        return sockets ? Array.from(sockets) : [];
    }

    static sendToClient(socketId: string, message: WebSocketMessage): void {
        const client = this.clients.get(socketId);
        if (client && client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
                logger.info(`Message sent to client ${socketId}: ${message.type}`);
            } catch (error: any) {
                logger.error(`Failed to send message to client ${socketId}: ${error.message}`);
            }
        } else {
            logger.warn(`Client ${socketId} not found or connection closed`);
        }
    }

    static broadcastToRoom(roomId: string, message: WebSocketMessage, excludeSocketId?: string): void {
        const sockets = this.getRoomSockets(roomId);
        logger.info(`Broadcasting to room ${roomId}. Found ${sockets.length} sockets: [${sockets.join(', ')}]`);

        if (sockets.length === 0) {
            logger.warn(`No sockets found in room ${roomId} for broadcasting`);
            return;
        }

        let sentCount = 0;
        sockets.forEach(socketId => {
            if (socketId !== excludeSocketId) {
                this.sendToClient(socketId, message);
                sentCount++;
            }
        });

        logger.info(`Broadcast complete. Sent to ${sentCount} clients in room ${roomId}`);
    }

    static broadcast(message: WebSocketMessage): void {
        this.clients.forEach((client, socketId) => {
            if (client.readyState === WebSocket.OPEN) {
                this.sendToClient(socketId, message);
            }
        });
    }

    static getStats() {
        return {
            totalClients: this.clients.size,
            authenticatedClients: this.authenticatedSockets.size,
            activeRooms: this.roomSockets.size,
            roomDetails: Array.from(this.roomSockets.entries()).map(([roomId, sockets]) => ({
                roomId,
                socketCount: sockets.size,
                sockets: Array.from(sockets)
            }))
        };
    }

    // Debug method to check room state
    static debugRoomState(roomId: string): void {
        const sockets = this.getRoomSockets(roomId);
        const authenticatedUsers = sockets.map(socketId => {
            const user = this.getAuthenticatedUser(socketId);
            return user ? `${user.username}(${socketId})` : `Unknown(${socketId})`;
        });

        logger.info(`Room ${roomId} debug: ${sockets.length} sockets - ${authenticatedUsers.join(', ')}`);
    }
}
