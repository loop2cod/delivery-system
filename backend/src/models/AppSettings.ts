import mongoose, { Document, Schema } from 'mongoose';

// AppSettings interface
export interface IAppSettings extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: any;
  description?: string;
  is_public: boolean;
  updated_by?: mongoose.Types.ObjectId;
  updated_at: Date;

  // Virtual
  id: string;
}

// AppSettings schema
const AppSettingsSchema = new Schema<IAppSettings>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  is_public: {
    type: Boolean,
    default: false
  },
  updated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { updatedAt: 'updated_at' },
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
AppSettingsSchema.index({ key: 1 });
AppSettingsSchema.index({ is_public: 1 });

// Virtual for id
AppSettingsSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export const AppSettings = mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);