import mongoose, { Schema } from 'mongoose';
import { IRoom } from '../types';

const RoomSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Room name is required'],
        trim: true,
        minlength: [1, 'Room name cannot be empty'],
        maxlength: [100, 'Room name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        trim: true
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    admins: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Virtual for member count
RoomSchema.virtual('memberCount').get(function () {
    return this.members.length;
});

// Indexes
RoomSchema.index({ name: 1 });
RoomSchema.index({ members: 1 });
RoomSchema.index({ lastActivity: -1 });
RoomSchema.index({ isPrivate: 1 });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
