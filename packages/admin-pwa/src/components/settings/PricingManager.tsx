'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, Save, Calculator, Weight, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';

interface PricingTier {
  minWeight: number;
  maxWeight?: number;
  type: 'fixed' | 'per_kg';
  price: number;
}

interface DeliveryPricing {
  _id?: string;
  name: string;
  description?: string;
  tiers: PricingTier[];
  isActive: boolean;
  isDefault: boolean;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PricingManagerProps {
  pricing: DeliveryPricing | null;
  onUpdate: () => void;
  companyId?: string;
}

export default function PricingManager({ pricing, onUpdate, companyId }: PricingManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    tiers: PricingTier[];
  }>({
    name: '',
    description: '',
    tiers: []
  });
  const [testWeight, setTestWeight] = useState<number>(1);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);

  useEffect(() => {
    if (pricing) {
      setFormData({
        name: pricing.name,
        description: pricing.description || '',
        tiers: pricing.tiers
      });
    } else {
      // Default sample pricing for new configurations
      setFormData({
        name: companyId ? 'Custom Company Pricing' : 'Default Delivery Pricing',
        description: 'Weight-based delivery pricing configuration',
        tiers: [
          { minWeight: 0, maxWeight: 4, type: 'fixed', price: 15 },
          { minWeight: 4, maxWeight: 30, type: 'fixed', price: 40 },
          { minWeight: 30, type: 'per_kg', price: 1.4 }
        ]
      });
    }
  }, [pricing, companyId]);

  const calculatePrice = (weight: number, tiers: PricingTier[]): number => {
    const sortedTiers = [...tiers].sort((a, b) => a.minWeight - b.minWeight);
    
    for (const tier of sortedTiers) {
      const inRange = weight >= tier.minWeight && (!tier.maxWeight || weight <= tier.maxWeight);
      
      if (inRange) {
        if (tier.type === 'fixed') {
          return tier.price;
        } else {
          return weight * tier.price;
        }
      }
    }
    
    // If no tier matches, use the last tier
    const lastTier = sortedTiers[sortedTiers.length - 1];
    if (lastTier.type === 'fixed') {
      return lastTier.price;
    } else {
      return weight * lastTier.price;
    }
  };

  const handleTestPrice = () => {
    if (testWeight > 0 && formData.tiers.length > 0) {
      const price = calculatePrice(testWeight, formData.tiers);
      setCalculatedPrice(price);
    }
  };

  const addTier = () => {
    const lastTier = formData.tiers[formData.tiers.length - 1];
    const newMinWeight = lastTier ? (lastTier.maxWeight || lastTier.minWeight) + 0.01 : 0;
    
    setFormData(prev => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          minWeight: newMinWeight,
          maxWeight: undefined,
          type: 'per_kg',
          price: 2
        }
      ]
    }));
  };

  const removeTier = (index: number) => {
    if (formData.tiers.length > 1) {
      setFormData(prev => ({
        ...prev,
        tiers: prev.tiers.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTier = (index: number, field: keyof PricingTier, value: any) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    }));
  };

  const validateTiers = (): string | null => {
    const { tiers } = formData;
    
    if (tiers.length === 0) {
      return 'At least one pricing tier is required';
    }

    // Sort tiers by minWeight for validation
    const sortedTiers = [...tiers].sort((a, b) => a.minWeight - b.minWeight);

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      
      if (tier.minWeight < 0) {
        return `Tier ${i + 1}: Minimum weight cannot be negative`;
      }
      
      if (tier.maxWeight && tier.maxWeight <= tier.minWeight) {
        return `Tier ${i + 1}: Maximum weight must be greater than minimum weight`;
      }
      
      if (tier.price <= 0) {
        return `Tier ${i + 1}: Price must be greater than 0`;
      }

      // Check for gaps between tiers
      if (i > 0) {
        const prevTier = sortedTiers[i - 1];
        if (prevTier.maxWeight && prevTier.maxWeight < tier.minWeight) {
          return `Gap detected between tier ${i} and tier ${i + 1}. Tier ${i} ends at ${prevTier.maxWeight}kg but tier ${i + 1} starts at ${tier.minWeight}kg`;
        }
      }

      // Check for overlaps between tiers
      if (i < sortedTiers.length - 1) {
        const nextTier = sortedTiers[i + 1];
        if (tier.maxWeight && tier.maxWeight > nextTier.minWeight) {
          return `Overlap detected between tier ${i + 1} and tier ${i + 2}. Tier ${i + 1} ends at ${tier.maxWeight}kg but tier ${i + 2} starts at ${nextTier.minWeight}kg`;
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateTiers();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      if (companyId) {
        // Company-specific pricing
        await adminAPI.setCompanyPricing(companyId, formData);
        toast.success('Company pricing updated successfully');
      } else {
        // Default pricing
        await adminAPI.createOrUpdateDefaultPricing(formData);
        toast.success('Default pricing updated successfully');
      }
      
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error saving pricing:', error);
      const message = error.response?.data?.error || error.message || 'Failed to save pricing';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const formatWeightRange = (tier: PricingTier): string => {
    if (tier.maxWeight) {
      return `${tier.minWeight}kg - ${tier.maxWeight}kg`;
    } else {
      return `${tier.minWeight}kg and above`;
    }
  };

  const formatPrice = (tier: PricingTier): string => {
    if (tier.type === 'fixed') {
      return `${tier.price} AED (fixed)`;
    } else {
      return `${tier.price} AED per kg`;
    }
  };

  if (!pricing && !isEditing) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {companyId ? 'No Custom Pricing Set' : 'No Default Pricing Configured'}
        </h3>
        <p className="text-gray-600 mb-6">
          {companyId 
            ? 'This company uses the default pricing. You can create custom pricing specific to this company.'
            : 'Set up the default delivery pricing that will be used for all companies unless they have custom pricing.'
          }
        </p>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {companyId ? 'Create Custom Pricing' : 'Create Default Pricing'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pricing Overview */}
      {!isEditing && pricing && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{pricing.name}</h3>
              {pricing.description && (
                <p className="text-sm text-gray-600 mt-1">{pricing.description}</p>
              )}
            </div>
            <Button onClick={() => setIsEditing(true)}>
              Edit Pricing
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {pricing.tiers.map((tier, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Weight className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{formatWeightRange(tier)}</div>
                        <div className="text-sm text-gray-600">{formatPrice(tier)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing Editor */}
      {isEditing && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {companyId ? 'Edit Custom Pricing' : 'Edit Default Pricing'}
            </h3>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Pricing'}
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pricing Plan Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter pricing plan name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Enter description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Tiers */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Pricing Tiers</h4>
                <Button onClick={addTier} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tier
                </Button>
              </div>

              <div className="space-y-4">
                {formData.tiers.map((tier, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">Tier {index + 1}</h5>
                      {formData.tiers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTier(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Weight (kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.minWeight}
                          onChange={(e) => updateTier(index, 'minWeight', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Weight (kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.maxWeight || ''}
                          onChange={(e) => updateTier(index, 'maxWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Unlimited"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pricing Type
                        </label>
                        <select
                          value={tier.type}
                          onChange={(e) => updateTier(index, 'type', e.target.value as 'fixed' | 'per_kg')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="fixed">Fixed Price</option>
                          <option value="per_kg">Per KG</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price (AED)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.price}
                          onChange={(e) => updateTier(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Price Calculator */}
          <Card>
            <CardContent className="p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Price Calculator</h4>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={testWeight}
                    onChange={(e) => setTestWeight(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button onClick={handleTestPrice}>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate
                </Button>
                {calculatedPrice !== null && (
                  <div className="text-lg font-semibold text-primary">
                    {calculatedPrice.toFixed(2)} AED
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}