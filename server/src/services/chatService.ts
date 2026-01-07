import { Message } from '../models/Message';
import { Room } from '../models/Room';
import { IMessage, SendMessageRequest } from '../types';
import { AppError, handleError } from '../utils/errorHandler';
import { validateSendMessage } from '../middleware/validation';

export class ChatService {
    static async sendMessage(data: SendMessageRequest & { sender: string }): Promise<IMessage> {
        try {
            const clientData = {
                roomId: data.roomId,
                content: data.content
            };

            validateSendMessage(clientData);

            // Check if user is member of the room
            const room = await Room.findById(data.roomId);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            if (!room.members.includes(data.sender)) {
                throw new AppError('You are not a member of this room', 403);
            }

            const message = new Message({
                content: data.content,
                sender: data.sender,
                room: data.roomId,
                type: 'text'
            });

            await message.save();

            // Update room's last activity
            await Room.findByIdAndUpdate(data.roomId, {
                lastActivity: new Date()
            });

            return message.populate('sender', 'username avatar');
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async getRoomMessages(roomId: string, userId: string, page = 1, limit = 50): Promise<IMessage[]> {
        try {
            // Check if user is member of the room
            const room = await Room.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            if (!room.members.includes(userId)) {
                throw new AppError('You are not a member of this room', 403);
            }

            return Message.find({ room: roomId })
                .populate('sender', 'username avatar')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit)
                .lean();
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async editMessage(messageId: string, newContent: string, userId: string): Promise<IMessage> {
        try {
            const message = await Message.findOne({ _id: messageId, sender: userId });
            if (!message) {
                throw new AppError('Message not found or unauthorized', 404);
            }

            message.content = newContent;
            message.isEdited = true;
            message.editedAt = new Date();

            await message.save();
            return message.populate('sender', 'username avatar');
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async deleteMessage(messageId: string, userId: string): Promise<void> {
        try {
            const message = await Message.findOne({ _id: messageId, sender: userId });
            if (!message) {
                throw new AppError('Message not found or unauthorized', 404);
            }

            await Message.findByIdAndDelete(messageId);
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async getMessageById(messageId: string): Promise<IMessage> {
        try {
            const message = await Message.findById(messageId)
                .populate('sender', 'username avatar');

            if (!message) {
                throw new AppError('Message not found', 404);
            }

            return message;
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }
}
