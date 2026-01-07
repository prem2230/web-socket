import { Room } from '../models/Room';
import { User } from '../models/User';
import { IRoom, CreateRoomRequest } from '../types';
import { AppError, handleError } from '../utils/errorHandler';
import { validateCreateRoom } from '../middleware/validation';

export class RoomService {
    static async createRoom(data: CreateRoomRequest & { createdBy: string }): Promise<IRoom> {
        try {
            const clientData = {
                name: data.name,
                description: data.description,
                isPrivate: data.isPrivate
            };

            validateCreateRoom(clientData);

            const room = new Room({
                name: data.name,
                description: data.description,
                isPrivate: data.isPrivate || false,
                createdBy: data.createdBy,
                members: [data.createdBy],
                admins: [data.createdBy]
            });

            await room.save();

            // Add room to user's rooms
            await User.findByIdAndUpdate(data.createdBy, {
                $addToSet: { rooms: room._id }
            });

            return room.populate(['members', 'admins', 'createdBy']);
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, 400);
        }
    }

    static async getAllRooms(userId: string): Promise<IRoom[]> {
        try {
            return Room.find({
                $or: [
                    { isPrivate: false },
                    { members: userId }
                ]
            })
                .populate('members', 'username avatar isOnline')
                .populate('createdBy', 'username')
                .sort({ lastActivity: -1 });
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, 400);
        }
    }

    static async getUserRooms(userId: string): Promise<IRoom[]> {
        try {
            return Room.find({ members: userId })
                .populate('members', 'username avatar isOnline')
                .populate('createdBy', 'username')
                .sort({ lastActivity: -1 });
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, 400);
        }
    }

    static async joinRoom(roomId: string, userId: string): Promise<IRoom> {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            if (room.members.includes(userId)) {
                throw new AppError('Already a member of this room', 400);
            }

            // Add user to room
            await Room.findByIdAndUpdate(roomId, {
                $addToSet: { members: userId },
                lastActivity: new Date()
            });

            // Add room to user's rooms
            await User.findByIdAndUpdate(userId, {
                $addToSet: { rooms: roomId }
            });

            return Room.findById(roomId)
                .populate('members', 'username avatar isOnline')
                .populate('createdBy', 'username') as Promise<IRoom>;
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async leaveRoom(roomId: string, userId: string): Promise<void> {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            if (!room.members.includes(userId)) {
                throw new AppError('Not a member of this room', 400);
            }

            // Remove user from room
            await Room.findByIdAndUpdate(roomId, {
                $pull: { members: userId, admins: userId }
            });

            // Remove room from user's rooms
            await User.findByIdAndUpdate(userId, {
                $pull: { rooms: roomId }
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async getRoomById(roomId: string): Promise<IRoom> {
        try {
            const room = await Room.findById(roomId)
                .populate('members', 'username avatar isOnline')
                .populate('admins', 'username avatar')
                .populate('createdBy', 'username');

            if (!room) {
                throw new AppError('Room not found', 404);
            }

            return room;
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async deleteRoom(roomId: string, userId: string): Promise<void> {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            if (room.createdBy.toString() !== userId) {
                throw new AppError('Only room creator can delete the room', 403);
            }

            // Remove room from all users
            await User.updateMany(
                { rooms: roomId },
                { $pull: { rooms: roomId } }
            );

            await Room.findByIdAndDelete(roomId);
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }
}
