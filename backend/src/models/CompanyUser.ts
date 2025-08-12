import mongoose, { Document, Schema } from 'mongoose';

// CompanyUser interface
export interface ICompanyUser extends Document {
  _id: mongoose.Types.ObjectId;
  company_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  is_primary: boolean;
  permissions: Record<string, any>;
  joined_at: Date;

  // Virtual
  id: string;
}

// CompanyUser schema
const CompanyUserSchema = new Schema<ICompanyUser>({
  company_id: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  permissions: {
    type: Schema.Types.Mixed,
    default: {}
  },
  joined_at: {
    type: Date,
    default: Date.now
  }
}, {
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
CompanyUserSchema.index({ company_id: 1 });
CompanyUserSchema.index({ user_id: 1 });
CompanyUserSchema.index({ company_id: 1, user_id: 1 }, { unique: true });
CompanyUserSchema.index({ company_id: 1, is_primary: 1 });

// Virtual for id
CompanyUserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const CompanyUser = mongoose.model<ICompanyUser>('CompanyUser', CompanyUserSchema);