import Joi from 'joi';
import { AppError } from '../utils/errorHandler';

export const validateRegister = (data: any) => {
    const schema = Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    });

    const { error } = schema.validate(data);
    if (error) {
        throw new AppError(error.details[0].message, 400);
    }
};

export const validateLogin = (data: any) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate(data);
    if (error) {
        throw new AppError(error.details[0].message, 400);
    }
};

export const validateCreateRoom = (data: any) => {
    const schema = Joi.object({
        name: Joi.string().min(1).max(100).required(),
        description: Joi.string().max(500).optional(),
        isPrivate: Joi.boolean().optional(),
        // createdBy: Joi.string().optional() // Allow createdBy field
    });

    const { error } = schema.validate(data);
    if (error) {
        throw new AppError(error.details[0].message, 400);
    }
};

export const validateJoinRoom = (data: any) => {
    const schema = Joi.object({
        roomId: Joi.string().required()
    });

    const { error } = schema.validate(data);
    if (error) {
        throw new AppError(error.details[0].message, 400);
    }
};

export const validateSendMessage = (data: any) => {
    const schema = Joi.object({
        roomId: Joi.string().required(),
        content: Joi.string().min(1).max(2000).required()
    });

    const { error } = schema.validate(data);
    if (error) {
        throw new AppError(error.details[0].message, 400);
    }
};
