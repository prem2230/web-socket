import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { handleError } from '../utils/errorHandler';

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
            };
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const decoded = AuthService.verifyToken(token);
        req.user = { userId: decoded.userId };

        next();
    } catch (error: any) {
        const errorInfo = handleError(error);
        res.status(401).json({
            success: false,
            message: errorInfo.message,
            code: errorInfo.code
        });
    }
};
