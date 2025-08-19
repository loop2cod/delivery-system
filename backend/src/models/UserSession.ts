import mongoose, { Document, Schema } from 'mongoose';

// UserSession interface
export interface IUserSession extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  token_hash: string;
  refresh_token_hash: string;
  pwa_type?: string;
  device_info?: Record<string, any>;
  ip_address?: string;
  expires_at: Date;
  last_used_at?: Date;
  created_at: Date;

  // Virtual
  id: string;
}

// UserSession schema
const UserSessionSchema = new Schema<IUserSession>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token_hash: {
    type: String,
    required: true
  },
  refresh_token_hash: {
    type: String,
    required: true
  },
  pwa_type: {
    type: String,
    trim: true
  },
  device_info: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ip_address: {
    type: String
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  last_used_at: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes (expires_at index is already created by the TTL index)
UserSessionSchema.index({ user_id: 1 });
UserSessionSchema.index({ token_hash: 1 });
UserSessionSchema.index({ refresh_token_hash: 1 });

// Virtual for id
UserSessionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const UserSession = mongoose.model<IUserSession>('UserSession', UserSessionSchema);