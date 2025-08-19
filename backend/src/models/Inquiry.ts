import mongoose, { Document, Schema } from 'mongoose';

// Inquiry status enum
export enum InquiryStatus {
  NEW = 'NEW',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED'
}

// Inquiry interface
export interface IInquiry extends Document {
  _id: mongoose.Types.ObjectId;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  business_type?: string;
  description?: string;
  license_number?: string;
  address?: string;
  city?: string;
  country: string;
  website?: string;
  status: InquiryStatus;
  notes?: string;
  documents: any[];
  created_at: Date;
  updated_at: Date;
  reviewed_by?: mongoose.Types.ObjectId;
  reviewed_at?: Date;

  // Virtual
  id: string;
}

// Inquiry schema
const InquirySchema = new Schema<IInquiry>({
  company_name: {
    type: String,
    required: true,
    trim: true
  },
  contact_person: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  business_type: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  license_number: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'UAE',
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(InquiryStatus),
    default: InquiryStatus.NEW
  },
  notes: {
    type: String,
    trim: true
  },
  documents: [{
    type: Schema.Types.Mixed,
    default: undefined
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  reviewed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewed_at: {
    type: Date
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

// Indexes
InquirySchema.index({ status: 1 });
InquirySchema.index({ email: 1 });
InquirySchema.index({ company_name: 1 });
InquirySchema.index({ created_at: -1 });

// Virtual for id
InquirySchema.virtual('id').get(function(this: any) {
  return this._id.toHexString();
});

export const Inquiry = mongoose.model<IInquiry>('Inquiry', InquirySchema);