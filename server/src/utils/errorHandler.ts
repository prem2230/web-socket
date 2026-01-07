import { logger } from './logger';

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const handleError = (error: any): { message: string; code: string } => {
    logger.error(`Error: ${error.message}`);

    // Mongoose validation error
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return { message: messages.join(', '), code: 'VALIDATION_ERROR' };
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return { message: `${field} already exists`, code: 'DUPLICATE_ERROR' };
    }

    // Mongoose cast error
    if (error.name === 'CastError') {
        return { message: 'Invalid ID format', code: 'CAST_ERROR' };
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return { message: 'Invalid token', code: 'JWT_ERROR' };
    }

    if (error.name === 'TokenExpiredError') {
        return { message: 'Token expired', code: 'JWT_EXPIRED' };
    }

    // Default error
    return {
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR'
    };
};
