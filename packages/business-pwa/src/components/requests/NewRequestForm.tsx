'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import axios from 'axios';
import { businessAPI, calculateTotalWeight, formatPrice, formatWeight, PriceCalculation } from '@/lib/api';

const deliveryRequestSchema = z.object({
  priority: z.enum(['normal', 'high', 'urgent']),
  pickupDetails: z.object({
    contactName: z.string().min(1, 'Contact name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    address: z.string().min(1, 'Pickup address is required'),
    instructions: z.string().optional(),
  }),
  deliveryDetails: z.object({
    contactName: z.string().min(1, 'Contact name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    address: z.string().min(1, 'Delivery address is required'),
    instructions: z.string().optional(),
  }),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    weight: z.number().optional(),
    dimensions: z.string().optional(),
    value: z.number().optional(),
    fragile: z.boolean().default(false),
  })).min(1, 'At least one item is required'),
  schedule: z.object({
    pickupDate: z.string().min(1, 'Pickup date is required'),
    pickupTime: z.string().min(1, 'Pickup time is required'),
    deliveryDate: z.string().min(1, 'Delivery date is required'),
    deliveryTime: z.string().min(1, 'Delivery time is required'),
  }),
  specialRequirements: z.string().optional(),
  internalReference: z.string().optional(),
});

type DeliveryRequestFormData = z.infer<typeof deliveryRequestSchema>;


const priorityOptions = [
  { value: 'normal', label: 'Normal', description: 'Standard processing', color: 'bg-gray-100 text-gray-800' },
  { value: 'high', label: 'High', description: 'Higher priority', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', description: 'Immediate attention', color: 'bg-red-100 text-red-800' },
];

interface Company {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  street_address: string;
  area: string;
  city: string;
  emirate: string;
  postal_code?: string;
  country: string;
  industry: string;
  monthly_volume_estimate?: number;
}

interface NewRequestFormProps {
  onSubmit: (data: DeliveryRequestFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function NewRequestForm({ onSubmit, onCancel, isSubmitting = false }: NewRequestFormProps) {
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyPricing, setCompanyPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const totalSteps = 3;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<DeliveryRequestFormData>({
    resolver: zodResolver(deliveryRequestSchema),
    defaultValues: {
      priority: 'normal',
      items: [{ description: '', quantity: 1, fragile: false }],
      pickupDetails: { contactName: '', phone: '', address: '', instructions: '' },
      deliveryDetails: { contactName: '', phone: '', address: '', instructions: '' },
      schedule: { pickupDate: '', pickupTime: '', deliveryDate: '', deliveryTime: '' },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedValues = watch();

  // Load company profile and pricing on component mount
  useEffect(() => {
    loadCompanyProfile();
    loadCompanyPricing();
  }, []);

  // Auto-fill pickup details when company profile is loaded and pickup details are empty
  useEffect(() => {
    if (company && !watchedValues.pickupDetails?.contactName && !watchedValues.pickupDetails?.phone && !watchedValues.pickupDetails?.address) {
      autoFillPickupDetailsQuiet();
    }
  }, [company]);

  const loadCompanyProfile = async () => {
    try {
      setLoadingCompany(true);
      const response = await businessAPI.getProfile();
      setCompany(response.company);
    } catch (error) {
      console.error('Failed to load company profile:', error);
    } finally {
      setLoadingCompany(false);
    }
  };

  const loadCompanyPricing = async () => {
    try {
      setLoadingPricing(true);
      const pricing = await businessAPI.getCompanyPricing();
      setCompanyPricing(pricing);
    } catch (error) {
      console.error('Failed to load company pricing:', error);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Auto-fill pickup details from company profile (with toast)
  const autoFillPickupDetails = () => {
    if (!company) {
      toast.error('Company profile not available');
      return;
    }

    fillPickupDetailsFromCompany();
    toast.success('Pickup details filled from company profile');
  };

  // Auto-fill pickup details from company profile (without toast)
  const autoFillPickupDetailsQuiet = () => {
    if (!company) return;
    fillPickupDetailsFromCompany();
  };

  // Common function to fill pickup details from company
  const fillPickupDetailsFromCompany = () => {
    if (!company) return;

    // Format address from company profile
    const fullAddress = [
      company.street_address,
      company.area,
      company.city,
      company.emirate.replace('_', ' '),
      company.postal_code,
      company.country
    ].filter(Boolean).join(', ');

    setValue('pickupDetails.contactName', company.contact_person);
    setValue('pickupDetails.phone', company.phone);
    setValue('pickupDetails.address', fullAddress);
  };

  // Calculate price for individual item weight using cumulative tier pricing
  const calculatePriceForWeight = (weight: number): number => {
    if (!companyPricing?.pricing?.tiers || weight <= 0) return 0;
    
    const tiers = companyPricing.pricing.tiers;
    const sortedTiers = tiers.sort((a: any, b: any) => a.minWeight - b.minWeight);
    
    let totalPrice = 0;
    
    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextTier = sortedTiers[i + 1];
      
      // Calculate the weight range for this tier
      let tierMinWeight = tier.minWeight;
      let tierMaxWeight = tier.maxWeight;
      
      // If no maxWeight specified and there's a next tier, use next tier's minWeight
      if (!tierMaxWeight && nextTier) {
        tierMaxWeight = nextTier.minWeight;
      }
      
      // Skip if the total weight doesn't reach this tier
      if (weight <= tierMinWeight) {
        break;
      }
      
      // Calculate weight that falls into this tier
      let weightInThisTier = 0;
      
      if (tierMaxWeight) {
        // Tier has a maximum weight
        if (weight <= tierMaxWeight) {
          // All remaining weight fits in this tier
          weightInThisTier = weight - tierMinWeight;
        } else {
          // Only part of the weight fits in this tier
          weightInThisTier = tierMaxWeight - tierMinWeight;
        }
      } else {
        // Tier has no maximum weight (last tier)
        weightInThisTier = weight - tierMinWeight;
      }
      
      // Calculate price for this tier
      if (weightInThisTier > 0) {
        if (tier.type === 'fixed') {
          // Fixed price for this entire tier range
          totalPrice += tier.price;
        } else if (tier.type === 'per_kg') {
          // Per kg price for the weight in this tier
          totalPrice += weightInThisTier * tier.price;
        }
      }
      
      // If we've processed all the weight, break
      if (tierMaxWeight && weight <= tierMaxWeight) {
        break;
      }
    }
    
    // Apply priority multiplier
    const priority = watchedValues.priority;
    const priorityMultiplier = {
      normal: 1.0,
      high: 1.2,
      urgent: 1.5,
    }[priority] || 1.0;
    
    return Math.round(totalPrice * priorityMultiplier);
  };

  // Calculate price based on weight using company-specific pricing
  const calculatePriceFromWeight = async () => {
    const items = watchedValues.items || [];
    const totalWeight = calculateTotalWeight(items);
    
    if (totalWeight <= 0) {
      setEstimatedCost(null);
      setPriceCalculation(null);
      return;
    }

    try {
      setCalculatingPrice(true);
      const calculation = await businessAPI.calculatePrice(totalWeight);
      
      let finalPrice = calculation.price;
      
      // Apply priority multiplier to the base weight-based price
      const priority = watchedValues.priority;
      
      const priorityMultiplier = {
        normal: 1.0,
        high: 1.2,
        urgent: 1.5,
      }[priority] || 1.0;
      
      finalPrice = finalPrice * priorityMultiplier;
      
      setEstimatedCost(Math.round(finalPrice));
      setPriceCalculation({
        ...calculation,
        price: Math.round(finalPrice)
      });
    } catch (error) {
      console.error('Failed to calculate price:', error);
      // Fallback to basic calculation
      const priority = watchedValues.priority;
      const itemCount = items.length;
      
      let baseCost = 35;
      
      const priorityMultiplier = {
        normal: 1.0,
        high: 1.2,
        urgent: 1.5,
      }[priority] || 1.0;
      
      const itemMultiplier = 1 + (itemCount - 1) * 0.1;
      
      const total = baseCost * priorityMultiplier * itemMultiplier;
      setEstimatedCost(Math.round(total));
      setPriceCalculation(null);
    } finally {
      setCalculatingPrice(false);
    }
  };

  // Recalculate price when relevant fields change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculatePriceFromWeight();
    }, 500); // Debounce the calculation
    
    return () => clearTimeout(timeoutId);
  }, [watchedValues.items, watchedValues.priority]);

  const handleFormSubmit = async (data: DeliveryRequestFormData) => {
    try {
      // Add calculated pricing to the form data
      const submissionData = {
        ...data,
        estimatedCost,
        priceCalculation,
        totalWeight: calculateTotalWeight(data.items || []),
        submittedAt: new Date().toISOString()
      };
      
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const copyPickupToDelivery = () => {
    const pickupDetails = getValues('pickupDetails');
    setValue('deliveryDetails.contactName', pickupDetails.contactName);
    setValue('deliveryDetails.phone', pickupDetails.phone);
    toast.success('Contact details copied to delivery');
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step <= currentStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={clsx(
                  'w-16 h-1 mx-2',
                  step < currentStep ? 'bg-primary' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-sm">
        <span className={currentStep >= 1 ? 'text-primary font-medium' : 'text-gray-500'}>
          Pickup & Delivery
        </span>
        <span className={currentStep >= 2 ? 'text-primary font-medium' : 'text-gray-500'}>
          Items & Details
        </span>
        <span className={currentStep >= 3 ? 'text-primary font-medium' : 'text-gray-500'}>
          Schedule & Review
        </span>
      </div>
    </div>
  );


  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Pickup Details */}
      <div className="bg-green-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPinIcon className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Pickup Details</h3>
          </div>
          {company && (
            <button
              type="button"
              onClick={autoFillPickupDetails}
              disabled={loadingCompany}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BuildingOffice2Icon className="w-3 h-3 mr-1" />
              {loadingCompany ? 'Loading...' : 'Use Company Address'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              {...register('pickupDetails.contactName')}
              type="text"
              className="form-input"
              placeholder="Full name"
            />
            {errors.pickupDetails?.contactName && (
              <p className="mt-1 text-sm text-red-600">{errors.pickupDetails.contactName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('pickupDetails.phone')}
              type="tel"
              className="form-input"
              placeholder="+971-50-123-4567"
            />
            {errors.pickupDetails?.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.pickupDetails.phone.message}</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pickup Address
          </label>
          <textarea
            {...register('pickupDetails.address')}
            className="form-input"
            rows={3}
            placeholder="Complete pickup address including building, floor, and any landmarks"
          />
          {errors.pickupDetails?.address && (
            <p className="mt-1 text-sm text-red-600">{errors.pickupDetails.address.message}</p>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions (Optional)
          </label>
          <textarea
            {...register('pickupDetails.instructions')}
            className="form-input"
            rows={2}
            placeholder="Any special instructions for pickup (e.g., gate code, specific entrance)"
          />
        </div>
      </div>

      {/* Delivery Details */}
      <div className="bg-red-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPinIcon className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Delivery Details</h3>
          </div>
          <button
            type="button"
            onClick={copyPickupToDelivery}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Copy pickup contact
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              {...register('deliveryDetails.contactName')}
              type="text"
              className="form-input"
              placeholder="Full name"
            />
            {errors.deliveryDetails?.contactName && (
              <p className="mt-1 text-sm text-red-600">{errors.deliveryDetails.contactName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('deliveryDetails.phone')}
              type="tel"
              className="form-input"
              placeholder="+971-50-123-4567"
            />
            {errors.deliveryDetails?.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.deliveryDetails.phone.message}</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Address
          </label>
          <textarea
            {...register('deliveryDetails.address')}
            className="form-input"
            rows={3}
            placeholder="Complete delivery address including building, floor, and any landmarks"
          />
          {errors.deliveryDetails?.address && (
            <p className="mt-1 text-sm text-red-600">{errors.deliveryDetails.address.message}</p>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions (Optional)
          </label>
          <textarea
            {...register('deliveryDetails.instructions')}
            className="form-input"
            rows={2}
            placeholder="Any special instructions for delivery (e.g., office hours, reception desk)"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Items to Deliver</h3>
        <button
          type="button"
          onClick={() => append({ description: '', quantity: 1, fragile: false })}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Item
        </button>
      </div>

      {/* Weight Summary */}
      {watchedValues.items && watchedValues.items.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Total Weight & Price</h4>
              <p className="text-2xl font-bold text-blue-600">
                {formatWeight(calculateTotalWeight(watchedValues.items))}
              </p>
              {/* Show individual item breakdown */}
              <div className="mt-2 space-y-1">
                {watchedValues.items.map((item, idx) => {
                  const itemWeight = (item.weight || 0) * (item.quantity || 1);
                  const itemPrice = companyPricing && itemWeight > 0 ? calculatePriceForWeight(itemWeight) : 0;
                  
                  if (itemWeight > 0) {
                    return (
                      <div key={idx} className="text-xs text-blue-700 flex justify-between">
                        <span>Item {idx + 1}: {formatWeight(itemWeight)}</span>
                        <span>{itemPrice > 0 ? formatPrice(itemPrice) : '...'}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            {loadingPricing && (
              <div className="flex items-center text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                Loading pricing...
              </div>
            )}
            {companyPricing && calculateTotalWeight(watchedValues.items) > 0 && (
              <div className="text-right">
                <p className="text-sm text-blue-700">Total Estimated Price</p>
                <p className="text-xl font-bold text-blue-600">
                  {(() => {
                    const totalWeight = calculateTotalWeight(watchedValues.items);
                    const totalPrice = totalWeight > 0 ? calculatePriceForWeight(totalWeight) : 0;
                    return formatPrice(totalPrice);
                  })()}
                </p>
                <p className="text-xs text-blue-600">
                  Priority: {watchedValues.priority} ({
                    { normal: '1.0x', high: '1.2x', urgent: '1.5x' }[watchedValues.priority]
                  })
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Using {companyPricing.isCustom ? 'custom' : 'default'} pricing
                </p>
              </div>
            )}
            {!companyPricing && calculateTotalWeight(watchedValues.items || []) > 0 && (
              <div className="text-right text-sm text-gray-500">
                <p>Loading pricing...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  {...register(`items.${index}.description`)}
                  type="text"
                  className="form-input"
                  placeholder="Describe the item (e.g., Documents, Electronics, etc.)"
                />
                {errors.items?.[index]?.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.description?.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register(`items.${index}.weight`, { 
                      valueAsNumber: true,
                      required: 'Weight is required for price calculation'
                    })}
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-input pr-20"
                    placeholder="0.5"
                  />
                  {/* Real-time price calculation for this item */}
                  {watchedValues.items?.[index]?.weight > 0 && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {(() => {
                          const item = watchedValues.items?.[index];
                          if (!item) return '';
                          const itemWeight = (item.weight || 0) * (item.quantity || 1);
                          if (itemWeight > 0 && companyPricing) {
                            const itemPrice = calculatePriceForWeight(itemWeight);
                            return itemPrice > 0 ? `${formatPrice(itemPrice)}` : '...';
                          }
                          return loadingPricing ? '...' : '';
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                {errors.items?.[index]?.weight && (
                  <p className="mt-1 text-sm text-red-600">{errors.items[index]?.weight?.message}</p>
                )}
                {/* Show individual item calculation */}
                {watchedValues.items?.[index]?.weight && watchedValues.items[index]?.weight > 0 && companyPricing && (
                  <p className="mt-1 text-xs text-gray-600">
                    {(() => {
                      const item = watchedValues.items?.[index];
                      if (!item) return '';
                      const itemWeight = (item.weight || 0) * (item.quantity || 1);
                      const quantity = item.quantity || 1;
                      const singleWeight = item.weight || 0;
                      
                      if (quantity > 1) {
                        return `${quantity} × ${formatWeight(singleWeight)} = ${formatWeight(itemWeight)} → Priority: ${watchedValues.priority}`;
                      } else {
                        return `${formatWeight(itemWeight)} → Priority: ${watchedValues.priority}`;
                      }
                    })()}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimensions - Optional
                </label>
                <input
                  {...register(`items.${index}.dimensions`)}
                  type="text"
                  className="form-input"
                  placeholder="L x W x H (cm)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value (AED) - Optional
                </label>
                <input
                  {...register(`items.${index}.value`, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="100.00"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  {...register(`items.${index}.fragile`)}
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">
                  This item is fragile and requires special handling
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Special Requirements (Optional)
        </label>
        <textarea
          {...register('specialRequirements')}
          className="form-input"
          rows={3}
          placeholder="Any special handling requirements, temperature control, insurance, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Internal Reference (Optional)
        </label>
        <input
          {...register('internalReference')}
          type="text"
          className="form-input"
          placeholder="Your internal tracking number or reference"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Schedule */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CalendarIcon className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Schedule</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Pickup</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  {...register('schedule.pickupDate')}
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.schedule?.pickupDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.schedule.pickupDate.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  {...register('schedule.pickupTime')}
                  type="time"
                  className="form-input"
                />
                {errors.schedule?.pickupTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.schedule.pickupTime.message}</p>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Delivery</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  {...register('schedule.deliveryDate')}
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.schedule?.deliveryDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.schedule.deliveryDate.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  {...register('schedule.deliveryTime')}
                  type="time"
                  className="form-input"
                />
                {errors.schedule?.deliveryTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.schedule.deliveryTime.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Estimate */}
      {estimatedCost && (
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CurrencyDollarIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Estimated Cost</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(estimatedCost)}</p>
              <p className="text-sm text-gray-600">
                {priceCalculation ? 
                  `Based on ${formatWeight(calculateTotalWeight(watchedValues.items || []))} total weight` :
                  'Estimated pricing - add item weights for accurate calculation'
                }
              </p>
              {priceCalculation?.breakdown && (
                <p className="text-xs text-gray-500 mt-1">
                  {priceCalculation.breakdown.calculation}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Priority: {watchedValues.priority}</p>
              <p>Weight: {formatWeight(calculateTotalWeight(watchedValues.items || []))}</p>
              <p>Items: {watchedValues.items?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Request Summary</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Priority:</span> {watchedValues.priority}</p>
          <p><span className="font-medium">Items:</span> {watchedValues.items?.length || 0} item(s)</p>
          <p><span className="font-medium">Pickup:</span> {watchedValues.pickupDetails?.address}</p>
          <p><span className="font-medium">Delivery:</span> {watchedValues.deliveryDetails?.address}</p>
          <p><span className="font-medium">Schedule:</span> {watchedValues.schedule?.pickupDate} at {watchedValues.schedule?.pickupTime}</p>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="max-w-4xl mx-auto">
      {renderStepIndicator()}
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          
          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </div>
                ) : (
                  'Submit Request'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}