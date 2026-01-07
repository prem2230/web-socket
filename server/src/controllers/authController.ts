import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

declare global {
    namespace Express {
        interface Request {
            user?: { userId: string };
        }
    }
}

export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const { user, token } = await AuthService.register(req.body);

            logger.info(`User registered: ${user.email}`);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user,
                    token
                }
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            logger.error(`Registration failed: ${errorInfo.message}`);

            res.status(error.statusCode || 400).json({
                success: false,
                message: errorInfo.message,
                code: errorInfo.code
            });
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const { user, token } = await AuthService.login(req.body);

            logger.info(`User logged in: ${user.email}`);

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user,
                    token
                }
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            logger.error(`Login failed: ${errorInfo.message}`);

            res.status(error.statusCode || 400).json({
                success: false,
                message: errorInfo.message,
                code: errorInfo.code
            });
        }
    }

    static async logout(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (userId) {
                await AuthService.logout(userId);
                logger.info(`User logged out: ${userId}`);
            }

            res.json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            logger.error(`Logout failed: ${errorInfo.message}`);

            res.status(error.statusCode || 400).json({
                success: false,
                message: errorInfo.message,
                code: errorInfo.code
            });
        }
    }

    static async getProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            const user = await AuthService.getUserById(userId);

            res.json({
                success: true,
                data: { user }
            });
        } catch (error: any) {
            const errorInfo = handleError(error);
            logger.error(`Get profile failed: ${errorInfo.message}`);

            res.status(error.statusCode || 400).json({
                success: false,
                message: errorInfo.message,
                code: errorInfo.code
            });
        }
    }
}
