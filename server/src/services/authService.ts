import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { IUser, LoginRequest, RegisterRequest } from '../types';
import { validateLogin, validateRegister } from '../middleware/validation';

export class AuthService {
    private static JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';
    private static JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    static generateToken(userId: string): string {
        return jwt.sign(
            { userId } as any,
            this.JWT_SECRET as any,
            { expiresIn: this.JWT_EXPIRES_IN as any }
        );
    }

    static verifyToken(token: string): { userId: string } {
        try {
            return jwt.verify(token, this.JWT_SECRET) as { userId: string };
        } catch (error) {
            throw new AppError('Invalid or expired token', 401);
        }
    }

    static async register(data: RegisterRequest): Promise<{ user: IUser; token: string }> {
        try {
            validateRegister(data);

            const user = new User(data);
            await user.save();

            const token = this.generateToken(user._id.toString());

            return { user, token };
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, 400);
        }
    }

    static async login(data: LoginRequest): Promise<{ user: IUser; token: string }> {
        try {
            validateLogin(data);

            const user = await User.findOne({ email: data.email }).select('+password');
            if (!user) {
                throw new AppError('Invalid email or password', 401);
            }

            const isPasswordValid = await user.comparePassword(data.password);
            if (!isPasswordValid) {
                throw new AppError('Invalid email or password', 401);
            }

            // Update user status
            user.isOnline = true;
            user.lastSeen = new Date();
            await user.save();

            const token = this.generateToken(user._id.toString());

            return { user, token };
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }

    static async logout(userId: string): Promise<void> {
        try {
            await User.findByIdAndUpdate(userId, {
                isOnline: false,
                lastSeen: new Date()
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, 400);
        }
    }

    static async getUserById(userId: string): Promise<IUser> {
        try {
            const user = await User.findById(userId).populate('rooms');
            if (!user) {
                throw new AppError('User not found', 404);
            }
            return user;
        } catch (error: any) {
            const errorInfo = handleError(error);
            throw new AppError(errorInfo.message, error.statusCode || 400);
        }
    }
}
