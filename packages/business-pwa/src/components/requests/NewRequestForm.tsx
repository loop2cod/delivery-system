'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import { businessAPI, calculateTotalWeight, PriceCalculation } from '@/lib/api';
import { deliveryRequestSchema, DeliveryRequestFormData, Company } from './types';
import { StepIndicator } from './form/StepIndicator';
import { PickupDeliveryStep } from './form/PickupDeliveryStep';
import { ItemsStep } from './form/ItemsStep';
import { ScheduleReviewStep } from './form/ScheduleReviewStep';

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
    mode: 'onSubmit', // Only validate on submit
    defaultValues: {
      priority: 'normal',
      items: [{ description: '', quantity: 1, weight: 0.5, fragile: false, paymentType: 'paid' }],
      pickupDetails: { contactName: '', phone: '', address: '', instructions: '' },
      deliveryDetails: { contactName: '', phone: '', address: '', instructions: '' },
      schedule: { pickupDate: '', pickupTime: '', deliveryDate: '', deliveryTime: '' },
    },
  });

  const { append, remove } = useFieldArray({
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

  const calculatePriceForWeight = (weight: number): number => {
    if (!companyPricing?.pricing?.tiers || weight <= 0) return 0;
    
    const tiers = companyPricing.pricing.tiers;
    const sortedTiers = tiers.sort((a: any, b: any) => a.minWeight - b.minWeight);
    let totalPrice = 0;
    
    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextTier = sortedTiers[i + 1];
      
      let tierMinWeight = tier.minWeight;
      let tierMaxWeight = tier.maxWeight;
      
      if (!tierMaxWeight && nextTier) {
        tierMaxWeight = nextTier.minWeight;
      }
      
      if (weight <= tierMinWeight) break;
      
      let weightInThisTier = 0;
      if (tierMaxWeight) {
        if (weight <= tierMaxWeight) {
          weightInThisTier = weight - tierMinWeight;
        } else {
          weightInThisTier = tierMaxWeight - tierMinWeight;
        }
      } else {
        weightInThisTier = weight - tierMinWeight;
      }
      
      if (weightInThisTier > 0) {
        if (tier.type === 'fixed') {
          totalPrice += tier.price;
        } else if (tier.type === 'per_kg') {
          totalPrice += weightInThisTier * tier.price;
        }
      }
      
      if (tierMaxWeight && weight <= tierMaxWeight) break;
    }
    
    const priority = watchedValues.priority;
    const priorityMultiplier = { normal: 1.0, high: 1.2, urgent: 1.5 }[priority] || 1.0;
    
    return Math.round(totalPrice * priorityMultiplier);
  };

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
      
      const priority = watchedValues.priority;
      const priorityMultiplier = { normal: 1.0, high: 1.2, urgent: 1.5 }[priority] || 1.0;
      const finalPrice = calculation.price * priorityMultiplier;
      
      setEstimatedCost(Math.round(finalPrice));
      setPriceCalculation({ ...calculation, price: Math.round(finalPrice) });
    } catch (error) {
      console.error('Failed to calculate price:', error);
      const priority = watchedValues.priority;
      const priorityMultiplier = { normal: 1.0, high: 1.2, urgent: 1.5 }[priority] || 1.0;
      const baseCost = 35 * priorityMultiplier * (1 + (items.length - 1) * 0.1);
      setEstimatedCost(Math.round(baseCost));
      setPriceCalculation(null);
    } finally {
      setCalculatingPrice(false);
    }
  };

  // Recalculate price when relevant fields change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculatePriceFromWeight();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedValues.items, watchedValues.priority]);

  const handleFormSubmit = async (data: DeliveryRequestFormData) => {
    try {
      // Show validation errors through toast if any
      if (Object.keys(errors).length > 0) {
        const firstError = Object.values(errors)[0];
        let errorMessage = 'Please check the form fields';
        
        if (firstError?.message) {
          errorMessage = firstError.message;
        } else if (firstError && typeof firstError === 'object') {
          // Handle nested errors (like pickupDetails.contactName)
          const nestedError = Object.values(firstError)[0] as any;
          if (nestedError?.message) {
            errorMessage = nestedError.message;
          }
        }
        
        toast.error('Form validation failed', {
          description: errorMessage
        });
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
      toast.error('Failed to submit request', {
        description: error?.response?.data?.error || error?.message || 'Please try again'
      });
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
    if (!pickupDetails.contactName || !pickupDetails.phone) {
      toast.warning('Please fill pickup contact details first');
      return;
    }
    setValue('deliveryDetails.contactName', pickupDetails.contactName);
    setValue('deliveryDetails.phone', pickupDetails.phone);
    toast.success('Contact details copied to delivery');
  };

  const addNewItem = () => {
    append({ description: '', quantity: 1, weight: 0.5, fragile: false, paymentType: 'paid' });
    toast.info('New item added');
  };

  const removeItem = (index: number) => {
    const items = getValues('items');
    const itemDescription = items[index]?.description || `Item ${index + 1}`;
    remove(index);
    toast.success(`Item removed: ${itemDescription.substring(0, 30)}${itemDescription.length > 30 ? '...' : ''}`);
  };

  const stepLabels = ['Pickup & Delivery', 'Items & Details', 'Schedule & Review'];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="max-w-4xl mx-auto" noValidate>
      <StepIndicator 
        currentStep={currentStep} 
        totalSteps={totalSteps} 
        stepLabels={stepLabels} 
      />
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        {currentStep === 1 && (
          <PickupDeliveryStep
            register={register}
            company={company}
            loadingCompany={loadingCompany}
            onAutoFillPickup={autoFillPickupDetails}
            onCopyPickupToDelivery={copyPickupToDelivery}
          />
        )}
        
        {currentStep === 2 && (
          <ItemsStep
            register={register}
            control={control}
            watchedValues={watchedValues}
            companyPricing={companyPricing}
            loadingPricing={loadingPricing}
            calculatePriceForWeight={calculatePriceForWeight}
            onAddItem={addNewItem}
            onRemoveItem={removeItem}
          />
        )}
        
        {currentStep === 3 && (
          <ScheduleReviewStep
            register={register}
            watchedValues={watchedValues}
            estimatedCost={estimatedCost}
            priceCalculation={priceCalculation}
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
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
              >
                Next Step
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