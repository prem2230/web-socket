import mongoose, { Schema } from 'mongoose';
import { IMessage } from '../types';

const MessageSchema = new Schema({
    content: {
        type: String,
        required: [true, 'Message content is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender is required']
    },
    room: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'Room is required']
    },
    type: {
        type: String,
        enum: ['text', 'system'],
        default: 'text'
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Pre-save middleware
MessageSchema.pre('save', function () {
    if (this.isEdited && !this.editedAt) {
        this.editedAt = new Date();
    }
});

// Indexes
MessageSchema.index({ room: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
