import WebSocket from 'ws';
import { AuthService } from '../services/authService';
import { RoomService } from '../services/roomService';
import { ChatService } from '../services/chatService';
import { WebSocketService } from '../services/webSocketService';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

export class ChatController {
    static handleConnection(ws: WebSocket, socketId: string) {
        logger.info(`New WebSocket connection: ${socketId}`);
        WebSocketService.addClient(socketId, ws);

        ws.on('message', async (data: WebSocket.RawData) => {
            try {
                const rawMessage = data.toString().trim();
                const message = JSON.parse(rawMessage);
                await this.handleMessage(socketId, message);
            } catch (error: any) {
                logger.error(`Message parsing error: ${error.message}`);
                WebSocketService.sendToClient(socketId, {
                    type: 'error',
                    data: { message: 'Invalid message format' },
                    timestamp: new Date().toISOString()
                });
            }
        });

        ws.on('close', () => {
            this.handleDisconnection(socketId);
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error for ${socketId}: ${error.message}`);
        });

        // Send welcome message
        WebSocketService.sendToClient(socketId, {
            type: 'success',
            data: {
                message: 'Connected to chat server. Please authenticate.',
                socketId
            },
            timestamp: new Date().toISOString()
        });
    }

    static async handleMessage(socketId: string, message: any) {
        const { type, data, token } = message;

        try {
            // Handle authentication
            if (type === 'authenticate') {
                await this.handleAuthenticate(socketId, data);
                return;
            }

            // Check authentication for all other operations
            if (!WebSocketService.isAuthenticated(socketId)) {
                WebSocketService.sendToClient(socketId, {
                    type: 'error',
                    data: { message: 'Authentication required' },
                    timestamp: new Date().toISOString()
                });
                return;
            }

            switch (type) {
                case 'get_rooms':
                    await this.handleGetRooms(socketId);
                    break;
                case 'create_room':
                    await this.handleCreateRoom(socketId, data);
                    break;
                case 'join_room':
                    await this.handleJoinRoom(socketId, data);
                    break;
                case 'leave_room':
                    await this.handleLeaveRoom(socketId, data);
                    break;
                case 'send_message':
                    await this.handleSendMessage(socketId, data);
                    break;
                case 'get_messages':
                    await this.handleGetMessages(socketId, data);
                    break;
                case 'logout':
                    await this.handleLogout(socketId);
                    break;
                default:
                    WebSocketService.sendToClient(socketId, {
                        type: 'error',
                        data: { message: `Unknown message type: ${type}` },
                        timestamp: new Date().toISOString()
                    });
            }
        } catch (error: any) {
            const errorInfo = handleError(error);
            logger.error(`Handle message error: ${errorInfo.message}`);

            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: {
                    message: errorInfo.message,
                    code: errorInfo.code
                },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleAuthenticate(socketId: string, data: { token: string }) {
        try {
            if (!data.token) {
                throw new Error('Token is required');
            }

            const { userId } = AuthService.verifyToken(data.token);
            const user = await AuthService.getUserById(userId);

            WebSocketService.authenticateSocket(socketId, {
                socketId,
                userId: user._id.toString(),
                username: user.username,
                token: data.token
            });

            // Update user online status
            user.isOnline = true;
            user.lastSeen = new Date();
            await user.save();

            WebSocketService.sendToClient(socketId, {
                type: 'authenticated',
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        avatar: user.avatar,
                        isOnline: user.isOnline
                    }
                },
                timestamp: new Date().toISOString()
            });

            logger.info(`User authenticated via WebSocket: ${user.username}`);
        } catch (error: any) {
            const errorInfo = handleError(error);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: {
                    message: errorInfo.message,
                    code: 'AUTH_FAILED'
                },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleGetRooms(socketId: string) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (!authUser) throw new Error('User not authenticated');

            const rooms = await RoomService.getAllRooms(authUser.userId);

            WebSocketService.sendToClient(socketId, {
                type: 'room_list',
                data: { rooms },
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: { message: errorInfo.message },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleCreateRoom(socketId: string, data: any) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (!authUser) throw new Error('User not authenticated');

            const room = await RoomService.createRoom({
                ...data,
                createdBy: authUser.userId
            });

            WebSocketService.sendToClient(socketId, {
                type: 'success',
                data: {
                    message: 'Room created successfully',
                    room
                },
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: { message: errorInfo.message },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleJoinRoom(socketId: string, data: { roomId: string }) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (!authUser) throw new Error('User not authenticated');

            logger.info(`User ${authUser.username} attempting to join room ${data.roomId}`);

            const room = await RoomService.joinRoom(data.roomId, authUser.userId);
            WebSocketService.addToRoom(data.roomId, socketId);

            // Debug room state
            WebSocketService.debugRoomState(data.roomId);

            // Get recent messages
            const messages = await ChatService.getRoomMessages(data.roomId, authUser.userId);

            WebSocketService.sendToClient(socketId, {
                type: 'room_joined',
                data: {
                    room,
                    messages: messages.reverse()
                },
                timestamp: new Date().toISOString()
            });

            // Notify other room members
            logger.info(`Notifying other members in room ${data.roomId} about ${authUser.username} joining`);
            WebSocketService.broadcastToRoom(data.roomId, {
                type: 'user_joined',
                data: {
                    username: authUser.username,
                    userId: authUser.userId,
                    roomId: data.roomId
                },
                timestamp: new Date().toISOString()
            }, socketId);

        } catch (error: any) {
            const errorInfo = handleError(error);
            logger.error(`Join room error: ${errorInfo.message}`);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: { message: errorInfo.message },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleLeaveRoom(socketId: string, data: { roomId: string }) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (!authUser) throw new Error('User not authenticated');

            await RoomService.leaveRoom(data.roomId, authUser.userId);
            WebSocketService.removeFromRoom(data.roomId, socketId);

            // Notify other room members
            WebSocketService.broadcastToRoom(data.roomId, {
                type: 'user_left',
                data: {
                    username: authUser.username,
                    userId: authUser.userId,
                    roomId: data.roomId
                },
                timestamp: new Date().toISOString()
            });

            WebSocketService.sendToClient(socketId, {
                type: 'success',
                data: { message: 'Left room successfully' },
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            const errorInfo = handleError(error);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: { message: errorInfo.message },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleSendMessage(socketId: string, data: { roomId: string; content: string }) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (!authUser) throw new Error('User not authenticated');

            logger.info(`User ${authUser.username} sending message to room ${data.roomId}: "${data.content}"`);

            const message = await ChatService.sendMessage({
                ...data,
                sender: authUser.userId
            });

            // Debug room state before broadcasting
            WebSocketService.debugRoomState(data.roomId);

            // Broadcast to all room members (including sender)
            logger.info(`Broadcasting message from ${authUser.username} to room ${data.roomId}`);
            WebSocketService.broadcastToRoom(data.roomId, {
                type: 'new_message',
                data: message,
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            const errorInfo = handleError(error);
            logger.error(`Send message error: ${errorInfo.message}`);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: { message: errorInfo.message },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleGetMessages(socketId: string, data: { roomId: string; page?: number }) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (!authUser) throw new Error('User not authenticated');

            const messages = await ChatService.getRoomMessages(
                data.roomId,
                authUser.userId,
                data.page || 1
            );

            WebSocketService.sendToClient(socketId, {
                type: 'success',
                data: {
                    messages: messages.reverse(),
                    roomId: data.roomId,
                    page: data.page || 1
                },
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            const errorInfo = handleError(error);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: { message: errorInfo.message },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleLogout(socketId: string) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (authUser) {
                await AuthService.logout(authUser.userId);
            }

            WebSocketService.sendToClient(socketId, {
                type: 'success',
                data: { message: 'Logged out successfully' },
                timestamp: new Date().toISOString()
            });

            // Close connection after logout
            const client = WebSocketService['clients'].get(socketId);
            if (client) {
                client.close();
            }

        } catch (error: any) {
            const errorInfo = handleError(error);
            WebSocketService.sendToClient(socketId, {
                type: 'error',
                data: { message: errorInfo.message },
                timestamp: new Date().toISOString()
            });
        }
    }

    static async handleDisconnection(socketId: string) {
        try {
            const authUser = WebSocketService.getAuthenticatedUser(socketId);
            if (authUser) {
                await AuthService.logout(authUser.userId);
                logger.info(`User disconnected: ${authUser.username}`);
            }

            WebSocketService.removeClient(socketId);
        } catch (error: any) {
            logger.error(`Disconnection error: ${error.message}`);
        }
    }
}
