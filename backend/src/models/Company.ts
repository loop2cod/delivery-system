import mongoose, { Document, Schema } from 'mongoose';

// Company status enum
export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

// Company interface
export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  license_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  website?: string;
  status: CompanyStatus;
  logo_url?: string;
  business_hours?: Record<string, any>;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;

  // Virtual
  id: string;
}

// Company schema
const CompanySchema = new Schema<ICompany>({
  name: {
    type: String,
    required: true,
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
  contact_person: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
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
    enum: Object.values(CompanyStatus),
    default: CompanyStatus.ACTIVE
  },
  logo_url: {
    type: String
  },
  business_hours: {
    type: Schema.Types.Mixed,
    default: {}
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {}
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

// Indexes
CompanySchema.index({ name: 1 });
CompanySchema.index({ status: 1 });
CompanySchema.index({ email: 1 });
CompanySchema.index({ license_number: 1 });

// Virtual for id
CompanySchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const Company = mongoose.model<ICompany>('Company', CompanySchema);