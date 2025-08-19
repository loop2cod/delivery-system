import mongoose, { Document, Schema } from 'mongoose';

// Driver status enum
export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ON_BREAK = 'ON_BREAK'
}

// Driver interface
export interface IDriver extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  license_number: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  status: DriverStatus;
  current_location?: Record<string, any>;
  rating: number;
  total_deliveries: number;
  is_verified: boolean;
  documents: any[];
  emergency_contact?: Record<string, any>;
  created_at: Date;
  updated_at: Date;

  // Virtual
  id: string;
}

// Driver schema
const DriverSchema = new Schema<IDriver>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  license_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vehicle_type: {
    type: String,
    trim: true
  },
  vehicle_plate: {
    type: String,
    trim: true
  },
  vehicle_model: {
    type: String,
    trim: true
  },
  vehicle_year: {
    type: Number
  },
  status: {
    type: String,
    enum: Object.values(DriverStatus),
    default: DriverStatus.OFFLINE
  },
  current_location: {
    type: Schema.Types.Mixed
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  total_deliveries: {
    type: Number,
    default: 0
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  documents: [{
    type: Schema.Types.Mixed,
    default: undefined
  }],
  emergency_contact: {
    type: Schema.Types.Mixed
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
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes (user_id and license_number indexes are already created by unique: true)
DriverSchema.index({ status: 1 });
DriverSchema.index({ is_verified: 1 });

// Virtual for id
DriverSchema.virtual('id').get(function(this: any) {
  return this._id.toHexString();
});

export const Driver = mongoose.model<IDriver>('Driver', DriverSchema);