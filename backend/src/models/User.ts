import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// User role and status enums
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  BUSINESS = 'BUSINESS',
  DRIVER = 'DRIVER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

// User interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  last_login?: Date;
  password_reset_token?: string;
  password_reset_expires?: Date;
  email_verified: boolean;
  email_verification_token?: string;
  profile_picture_url?: string;
  created_at: Date;
  updated_at: Date;

  // Virtual methods
  id: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User schema
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.BUSINESS
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE
  },
  last_login: {
    type: Date
  },
  password_reset_token: {
    type: String
  },
  password_reset_expires: {
    type: Date
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  email_verification_token: {
    type: String
  },
  profile_picture_url: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      (ret as any)._id = undefined; delete (ret as any)._id;
      (ret as any).__v = undefined; delete (ret as any).__v;
      // Use conditional deletion for optional properties
      if ('password_hash' in ret && ret.password_hash !== undefined) {
        (ret as any).password_hash = undefined; delete (ret as any).password_hash;
      }
      if ('password_reset_token' in ret && ret.password_reset_token !== undefined) {
        (ret as any).password_reset_token = undefined; delete (ret as any).password_reset_token;
      }
      if ('email_verification_token' in ret && ret.email_verification_token !== undefined) {
        (ret as any).email_verification_token = undefined; delete (ret as any).email_verification_token;
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes (email index is already created by unique: true)
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ email_verification_token: 1 });
UserSchema.index({ password_reset_token: 1 });

// Virtual for id
UserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Static method to hash password
UserSchema.statics.hashPassword = async function(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
};

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();
  
  // Only hash if it's a plain password (not already hashed)
  if (!this.password_hash.startsWith('$2')) {
    this.password_hash = await bcrypt.hash(this.password_hash, 12);
  }
  
  next();
});

export const User = mongoose.model<IUser>('User', UserSchema);