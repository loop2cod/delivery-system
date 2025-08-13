import mongoose, { Schema, Document } from 'mongoose';

export interface PricingTier {
  minWeight: number;  // Minimum weight in kg (inclusive)
  maxWeight?: number; // Maximum weight in kg (inclusive) - undefined means unlimited
  type: 'fixed' | 'per_kg'; // Fixed price or per kg pricing
  price: number;      // Price in AED
}

export interface DeliveryPricingData {
  name: string;           // Pricing plan name
  description?: string;   // Optional description
  tiers: PricingTier[];   // Array of pricing tiers
  isActive: boolean;      // Whether this pricing is active
  isDefault: boolean;     // Whether this is the default pricing for new companies
  companyId?: string;     // If set, this pricing is company-specific
  isCustomized?: boolean; // Whether company-specific pricing has been manually customized
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliveryPricing extends DeliveryPricingData, Document {}

const PricingTierSchema = new Schema({
  minWeight: {
    type: Number,
    required: true,
    min: 0
  },
  maxWeight: {
    type: Number,
    min: 0,
    validate: {
      validator: function(this: any, value: number) {
        return !value || value > this.minWeight;
      },
      message: 'Maximum weight must be greater than minimum weight'
    }
  },
  type: {
    type: String,
    enum: ['fixed', 'per_kg'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const DeliveryPricingSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tiers: {
    type: [PricingTierSchema],
    required: true,
    validate: {
      validator: function(tiers: PricingTier[]) {
        // Validate that tiers don't overlap and cover all weights properly
        if (tiers.length === 0) return false;
        
        // Sort tiers by minWeight
        const sortedTiers = [...tiers].sort((a, b) => a.minWeight - b.minWeight);
        
        // Check for gaps and overlaps
        for (let i = 0; i < sortedTiers.length; i++) {
          const current = sortedTiers[i];
          const next = sortedTiers[i + 1];
          
          // Check if current tier has valid range
          if (current.maxWeight && current.maxWeight <= current.minWeight) {
            return false;
          }
          
          // Check for gaps or overlaps with next tier
          if (next) {
            if (current.maxWeight && current.maxWeight < next.minWeight - 0.01) {
              // Gap between tiers
              return false;
            }
            if (current.maxWeight && current.maxWeight > next.minWeight + 0.01) {
              // Overlap between tiers
              return false;
            }
          }
        }
        
        return true;
      },
      message: 'Pricing tiers must not have gaps or overlaps'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  companyId: {
    type: String,
    sparse: true // Allows multiple null values but unique non-null values
  },
  isCustomized: {
    type: Boolean,
    default: false // false means it's synced with default, true means manually customized
  }
}, {
  timestamps: true
});

// Ensure only one default pricing exists (for global default)
DeliveryPricingSchema.index(
  { isDefault: 1 },
  { 
    unique: true,
    partialFilterExpression: { isDefault: true, companyId: { $exists: false } }
  }
);

// Ensure only one pricing per company (if company-specific)
DeliveryPricingSchema.index(
  { companyId: 1 },
  { 
    unique: true,
    partialFilterExpression: { companyId: { $exists: true } }
  }
);

// Helper method to calculate price for a given weight
DeliveryPricingSchema.methods.calculatePrice = function(weight: number): number {
  const tiers = this.tiers.sort((a: PricingTier, b: PricingTier) => a.minWeight - b.minWeight);
  
  for (const tier of tiers) {
    const inRange = weight >= tier.minWeight && (!tier.maxWeight || weight <= tier.maxWeight);
    
    if (inRange) {
      if (tier.type === 'fixed') {
        return tier.price;
      } else {
        return weight * tier.price;
      }
    }
  }
  
  // If no tier matches, use the last tier (should handle unlimited weight)
  const lastTier = tiers[tiers.length - 1];
  if (lastTier.type === 'fixed') {
    return lastTier.price;
  } else {
    return weight * lastTier.price;
  }
};

// Static method to get pricing for a company (company-specific or default)
DeliveryPricingSchema.statics.getPricingForCompany = async function(companyId?: string) {
  // First try to get company-specific pricing
  if (companyId) {
    const companyPricing = await this.findOne({ 
      companyId, 
      isActive: true 
    });
    if (companyPricing) {
      return companyPricing;
    }
  }
  
  // Fall back to default pricing
  return await this.findOne({ 
    isDefault: true, 
    isActive: true,
    companyId: { $exists: false }
  });
};

export const DeliveryPricing = mongoose.model<IDeliveryPricing>('DeliveryPricing', DeliveryPricingSchema);