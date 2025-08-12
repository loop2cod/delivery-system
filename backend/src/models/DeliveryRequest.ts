import mongoose, { Document, Schema } from 'mongoose';

// Request status enum
export enum RequestStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// DeliveryRequest interface
export interface IDeliveryRequest extends Document {
  _id: mongoose.Types.ObjectId;
  company_id: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  assigned_driver_id?: mongoose.Types.ObjectId;
  pickup_location: Record<string, any>;
  delivery_location: Record<string, any>;
  package_details: Record<string, any>;
  special_instructions?: string;
  status: RequestStatus;
  payment_status: PaymentStatus;
  estimated_cost?: number;
  actual_cost?: number;
  pickup_time?: Date;
  delivery_time?: Date;
  estimated_delivery?: Date;
  tracking_number?: string;
  qr_code?: string;
  created_at: Date;
  updated_at: Date;

  // Virtual
  id: string;
}

// DeliveryRequest schema
const DeliveryRequestSchema = new Schema<IDeliveryRequest>({
  company_id: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assigned_driver_id: {
    type: Schema.Types.ObjectId,
    ref: 'Driver'
  },
  pickup_location: {
    type: Schema.Types.Mixed,
    required: true
  },
  delivery_location: {
    type: Schema.Types.Mixed,
    required: true
  },
  package_details: {
    type: Schema.Types.Mixed,
    required: true
  },
  special_instructions: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(RequestStatus),
    default: RequestStatus.PENDING
  },
  payment_status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  estimated_cost: {
    type: Number
  },
  actual_cost: {
    type: Number
  },
  pickup_time: {
    type: Date
  },
  delivery_time: {
    type: Date
  },
  estimated_delivery: {
    type: Date
  },
  tracking_number: {
    type: String,
    unique: true,
    sparse: true
  },
  qr_code: {
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
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
DeliveryRequestSchema.index({ company_id: 1 });
DeliveryRequestSchema.index({ created_by: 1 });
DeliveryRequestSchema.index({ assigned_driver_id: 1 });
DeliveryRequestSchema.index({ status: 1 });
DeliveryRequestSchema.index({ tracking_number: 1 });
DeliveryRequestSchema.index({ created_at: -1 });

// Virtual for id
DeliveryRequestSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const DeliveryRequest = mongoose.model<IDeliveryRequest>('DeliveryRequest', DeliveryRequestSchema);