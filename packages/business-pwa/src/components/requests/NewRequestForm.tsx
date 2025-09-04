'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import { businessAPI, calculateTotalWeight, formatWeight, PriceCalculation } from '@/lib/api';
import { deliveryRequestSchema, DeliveryRequestFormData, Company } from './types';
import { StepIndicator } from './form/StepIndicator';
import { PickupDeliveryStep } from './form/PickupDeliveryStep';
import { ItemsStep } from './form/ItemsStep';
import { ScheduleReviewStep } from './form/ScheduleReviewStep';

interface NewRequestFormProps {
  onSubmit: (data: DeliveryRequestFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submissionError?: any;
  onRetry?: () => void;
}

export function NewRequestForm({ onSubmit, onCancel, isSubmitting = false, submissionError, onRetry }: NewRequestFormProps) {
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyPricing, setCompanyPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [stepValidation, setStepValidation] = useState<{ [key: number]: boolean }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
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
    mode: 'onChange', // Validate on change for better UX
    defaultValues: {
      priority: 'normal',
      items: [{ description: '', quantity: 1, weight: 0.5, fragile: false, paymentType: 'paid' }],
      pickupDetails: { contactName: '', phone: '', address: '', instructions: '' },
      deliveryDetails: { contactName: '', phone: '', address: '', instructions: '' },
      schedule: { 
        pickupDate: '', 
        pickupTime: '', 
        deliveryDate: '', 
        deliveryTime: '',
        isScheduled: false
      },
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

  // Auto-fill pickup details when company profile is loaded
  useEffect(() => {
    if (company && !watchedValues.pickupDetails?.contactName) {
      autoFillPickupDetailsQuiet();
    }
  }, [company, watchedValues.pickupDetails?.contactName]);

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
      console.log('Loaded company pricing:', pricing);
    } catch (error) {
      console.error('Failed to load company pricing:', error);
      // Set fallback pricing data on error
      setCompanyPricing(null);
    } finally {
      setLoadingPricing(false);
    }
  };

  const autoFillPickupDetails = () => {
    if (!company) {
      toast.error('Company profile not available');
      return;
    }
    fillPickupDetailsFromCompany();
    toast.success('Pickup details filled from company profile');
  };

  const autoFillPickupDetailsQuiet = () => {
    if (!company) return;
    fillPickupDetailsFromCompany();
  };

  const fillPickupDetailsFromCompany = () => {
    if (!company) return;
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


  const calculatePriceFromWeight = () => {
    const items = watchedValues.items || [];
    const totalWeight = calculateTotalWeight(items);
    
    if (totalWeight <= 0) {
      setEstimatedCost(null);
      setPriceCalculation(null);
      return;
    }

    setCalculatingPrice(true);
    
    try {
      // Use the loaded company pricing tiers for cumulative calculation
      let basePrice = 0;
      let calculationDetails = [];
      let finalTier = null;
      
      if (companyPricing?.pricing?.tiers && companyPricing.pricing.tiers.length > 0) {
        // Sort tiers by minimum weight for cumulative calculation
        const tiers = companyPricing.pricing.tiers.sort((a: any, b: any) => a.minWeight - b.minWeight);
        let remainingWeight = totalWeight;
        
        for (let i = 0; i < tiers.length; i++) {
          const tier = tiers[i];
          const nextTier = tiers[i + 1];
          
          // Determine the weight range for this tier
          const tierMin = tier.minWeight;
          const tierMax = tier.maxWeight || (nextTier ? nextTier.minWeight : Infinity);
          
          // Skip if total weight doesn't reach this tier
          if (totalWeight <= tierMin) break;
          
          // Calculate weight that falls in this tier
          const weightInTier = Math.min(remainingWeight, tierMax - Math.max(tierMin, 0));
          
          if (weightInTier > 0) {
            let tierCost = 0;
            
            if (tier.type === 'fixed') {
              // Fixed cost for this tier
              tierCost = tier.price;
              calculationDetails.push(`${formatWeight(Math.min(totalWeight, tierMax))} @ AED ${tier.price} (fixed)`);
            } else if (tier.type === 'per_kg') {
              // Per-kg cost for weight in this tier
              if (tierMin === 0) {
                // First tier starting from 0, use full weight up to max
                const effectiveWeight = Math.min(totalWeight, tierMax);
                tierCost = effectiveWeight * tier.price;
                calculationDetails.push(`${formatWeight(effectiveWeight)} @ AED ${tier.price}/kg`);
              } else {
                // Subsequent tiers, only charge for excess weight
                const excessWeight = totalWeight - tierMin;
                if (excessWeight > 0) {
                  const weightToCharge = Math.min(excessWeight, tierMax - tierMin);
                  tierCost = weightToCharge * tier.price;
                  calculationDetails.push(`${formatWeight(weightToCharge)} @ AED ${tier.price}/kg (excess over ${formatWeight(tierMin)})`);
                }
              }
            }
            
            basePrice += tierCost;
            finalTier = tier;
            remainingWeight -= weightInTier;
            
            // If we've consumed all weight, stop
            if (remainingWeight <= 0) break;
          }
        }
      }
      
      // Fallback if no pricing tiers available
      if (!finalTier) {
        // Simple fallback pricing with cumulative logic
        if (totalWeight <= 1) {
          basePrice = 25;
          calculationDetails.push(`${formatWeight(totalWeight)} @ AED 25 (fallback)`);
        } else if (totalWeight <= 5) {
          basePrice = 35 + (totalWeight - 1) * 5;
          calculationDetails.push(`Base AED 35 + ${formatWeight(totalWeight - 1)} @ AED 5/kg`);
        } else if (totalWeight <= 10) {
          basePrice = 55 + (totalWeight - 5) * 8;
          calculationDetails.push(`Base AED 55 + ${formatWeight(totalWeight - 5)} @ AED 8/kg`);
        } else if (totalWeight <= 20) {
          basePrice = 95 + (totalWeight - 10) * 6;
          calculationDetails.push(`Base AED 95 + ${formatWeight(totalWeight - 10)} @ AED 6/kg`);
        } else {
          basePrice = 155 + (totalWeight - 20) * 4;
          calculationDetails.push(`Base AED 155 + ${formatWeight(totalWeight - 20)} @ AED 4/kg`);
        }
        
        finalTier = {
          minWeight: 0,
          type: 'per_kg',
          price: basePrice / totalWeight
        };
      }
      
      // Use base price directly (no priority multipliers)
      const finalPrice = Math.round(basePrice * 100) / 100; // Round to 2 decimal places
      
      setEstimatedCost(finalPrice);
      setPriceCalculation({
        weight: totalWeight,
        price: finalPrice,
        currency: 'AED',
        pricingName: companyPricing?.pricing?.name || 'Default Pricing',
        isCustomPricing: companyPricing?.isCustom || false,
        breakdown: {
          tier: finalTier,
          calculation: calculationDetails.length > 0 ? 
            calculationDetails.join(' + ') :
            `${formatWeight(totalWeight)} × Tiered pricing`
        }
      });
    } finally {
      setCalculatingPrice(false);
    }
  };

  // Recalculate price when weight or pricing data changes
  useEffect(() => {
    if (!companyPricing || loadingPricing) return; // Wait for pricing data to load
    
    const timeoutId = setTimeout(() => {
      calculatePriceFromWeight();
    }, 300); // Reduced timeout for better responsiveness
    return () => clearTimeout(timeoutId);
  }, [JSON.stringify(watchedValues.items), companyPricing, loadingPricing]);

  // Validate individual steps
  const validateStep = (step: number): boolean => {
    const currentValues = getValues();
    
    switch (step) {
      case 1: // Pickup & Delivery
        const hasPickup = !!(currentValues.pickupDetails?.contactName && 
                         currentValues.pickupDetails?.phone && 
                         currentValues.pickupDetails?.address);
        const hasDelivery = !!(currentValues.deliveryDetails?.contactName && 
                           currentValues.deliveryDetails?.phone && 
                           currentValues.deliveryDetails?.address);
        return hasPickup && hasDelivery;
      
      case 2: // Items
        return !!(currentValues.items?.length > 0 && 
               currentValues.items.every(item => 
                 item.description && item.quantity > 0 && item.weight > 0
               ));
      
      case 3: // Schedule
        // Schedule is optional - always valid unless user chooses to schedule
        const isScheduled = currentValues.schedule?.isScheduled;
        if (!isScheduled) return true; // Optional scheduling is always valid
        
        // If user chooses to schedule, validate required fields
        return !!(currentValues.schedule?.pickupDate && 
               currentValues.schedule?.pickupTime && 
               currentValues.schedule?.deliveryDate && 
               currentValues.schedule?.deliveryTime);
      
      default:
        return false;
    }
  };

  // Update step validation when form values change
  useEffect(() => {
    const newValidation: { [key: number]: boolean } = {};
    for (let i = 1; i <= totalSteps; i++) {
      newValidation[i] = validateStep(i);
    }
    setStepValidation(newValidation);
  }, [
    watchedValues.pickupDetails?.contactName,
    watchedValues.pickupDetails?.phone, 
    watchedValues.pickupDetails?.address,
    watchedValues.deliveryDetails?.contactName,
    watchedValues.deliveryDetails?.phone,
    watchedValues.deliveryDetails?.address,
    JSON.stringify(watchedValues.items),
    watchedValues.schedule?.isScheduled,
    watchedValues.schedule?.pickupDate,
    watchedValues.schedule?.pickupTime,
    watchedValues.schedule?.deliveryDate,
    watchedValues.schedule?.deliveryTime
  ]);

  const handleFormSubmit = async (data: DeliveryRequestFormData) => {
    setShowValidationErrors(true);
    
    try {
      // Comprehensive validation check
      if (Object.keys(errors).length > 0) {
        const firstError = Object.values(errors)[0];
        let errorMessage = 'Please check the highlighted fields';
        
        if (firstError?.message) {
          errorMessage = firstError.message;
        } else if (firstError && typeof firstError === 'object') {
          // Handle nested errors (like pickupDetails.contactName)
          const nestedError = Object.values(firstError)[0] as any;
          if (nestedError?.message) {
            errorMessage = nestedError.message;
          }
        }
        
        toast.error('Please fix the following issues:', {
          description: errorMessage
        });
        
        // Navigate to the first step with errors
        for (let i = 1; i <= totalSteps; i++) {
          if (!validateStep(i)) {
            setCurrentStep(i);
            break;
          }
        }
        return;
      }

      const totalWeight = calculateTotalWeight(data.items);
      
      const submissionData = {
        ...data,
        estimatedCost: estimatedCost || 0,
        totalWeight,
        priceCalculation: priceCalculation || {
          weight: totalWeight,
          price: estimatedCost || 0,
          currency: 'AED'
        },
        submittedAt: new Date().toISOString()
      };
      
      await onSubmit(submissionData);
      
    } catch (error: any) {
      console.error('Form submission error:', error);
      // Let the parent component handle the error display
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
      setShowValidationErrors(true);
      toast.warning(`Please complete all required fields in this step`, {
        description: 'Fill in the highlighted fields to continue'
      });
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setShowValidationErrors(false); // Reset validation errors for new step
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const copyPickupToDelivery = () => {
    const pickupDetails = getValues('pickupDetails');
    if (!pickupDetails.contactName || !pickupDetails.phone) {
      toast.warning('Please fill pickup contact details first');
      return;
    }
    setValue('deliveryDetails.contactName', pickupDetails.contactName);
    setValue('deliveryDetails.phone', pickupDetails.phone);
    toast.success('Contact details copied to delivery');
  };

  const addNewItem = () => {
    const maxItems = 10;
    
    if (fields.length >= maxItems) {
      toast.warning(`Maximum ${maxItems} items allowed`, {
        description: 'Remove an existing item to add a new one'
      });
      return;
    }
    
    const newItemNumber = fields.length + 1;
    
    append({ 
      description: '', 
      quantity: 1, 
      weight: 0.5, 
      fragile: false, 
      paymentType: 'paid',
      dimensions: '',
      value: undefined,
      codAmount: undefined
    });
    
    toast.success(`Item ${newItemNumber} added successfully`, {
      description: `You now have ${newItemNumber} item${newItemNumber !== 1 ? 's' : ''} in your delivery`
    });
  };

  const removeItem = (index: number) => {
    if (fields.length <= 1) {
      toast.warning('Cannot remove the last item', {
        description: 'At least one item is required for delivery'
      });
      return;
    }
    
    try {
      const remainingItems = fields.length - 1;
      
      remove(index);
      
      toast.success(`Item removed successfully`, {
        description: `${remainingItems} item${remainingItems !== 1 ? 's' : ''} remaining in your delivery`
      });
      
      // Auto-recalculate pricing after item removal
      setTimeout(() => {
        calculatePriceFromWeight();
      }, 100);
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item', {
        description: 'Please try again'
      });
    }
  };

  const stepLabels = [
    { title: 'Pickup & Delivery', subtitle: 'Where to collect and deliver' },
    { title: 'Items & Details', subtitle: 'What needs to be delivered' },
    { title: 'Timing & Review', subtitle: 'When to deliver and final confirmation' }
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="max-w-7xl mx-auto" noValidate>
      <StepIndicator 
        currentStep={currentStep} 
        totalSteps={totalSteps} 
        stepLabels={stepLabels}
        stepValidation={stepValidation}
        showValidationErrors={showValidationErrors}
      />
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        {currentStep === 1 && (
          <PickupDeliveryStep
            register={register}
            errors={errors}
            company={company}
            loadingCompany={loadingCompany}
            onAutoFillPickup={autoFillPickupDetails}
            onCopyPickupToDelivery={copyPickupToDelivery}
            showValidationErrors={showValidationErrors}
            watchedValues={watchedValues}
          />
        )}
        
        {currentStep === 2 && (
          <ItemsStep
            register={register}
            control={control}
            errors={errors}
            fields={fields}
            watchedValues={watchedValues}
            companyPricing={companyPricing}
            loadingPricing={loadingPricing}
            estimatedCost={estimatedCost}
            calculatingPrice={calculatingPrice}
            onAddItem={addNewItem}
            onRemoveItem={removeItem}
            showValidationErrors={showValidationErrors}
          />
        )}
        
        {currentStep === 3 && (
          <ScheduleReviewStep
            register={register}
            errors={errors}
            watchedValues={watchedValues}
            estimatedCost={estimatedCost}
            priceCalculation={priceCalculation}
            showValidationErrors={showValidationErrors}
            stepValidation={stepValidation}
          />
        )}
        
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
                className={`px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-all duration-200 ${
                  stepValidation[currentStep] 
                    ? 'bg-primary hover:bg-primary/90 shadow-md' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                title={!stepValidation[currentStep] ? 'Please complete all required fields to continue' : ''}
              >
                Continue to {stepLabels[currentStep]?.title || 'Next Step'}
                <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !Object.values(stepValidation).every(Boolean)}
                className={`px-8 py-3 border border-transparent text-sm font-semibold rounded-md transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : Object.values(stepValidation).every(Boolean)
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                    : 'bg-gray-400 cursor-not-allowed text-white'
                }`}
                title={!Object.values(stepValidation).every(Boolean) ? 'Please complete all steps to submit' : ''}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting Request...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Delivery Request
                  </div>
                )}
              </button>
            )}
          </div>
          
          {/* Progress indicator */}
          <div className="text-center mt-4">
            <div className="text-sm text-gray-500">
              Step {currentStep} of {totalSteps} 
              {stepValidation[currentStep] && <span className="text-green-600 ml-1">✓</span>}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {stepLabels[currentStep - 1]?.subtitle}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}