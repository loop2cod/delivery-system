'use client';

import { useState } from 'react';
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
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const deliveryRequestSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
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

const serviceTypes = [
  { value: 'same_day', label: 'Same-Day Delivery', description: 'Delivered within the same day' },
  { value: 'express', label: 'Express Delivery', description: 'Priority delivery within 4 hours' },
  { value: 'document', label: 'Document Delivery', description: 'Secure document transportation' },
  { value: 'fragile', label: 'Fragile Items', description: 'Special handling for delicate items' },
  { value: 'inter_emirate', label: 'Inter-Emirate', description: 'Delivery between emirates' },
];

const priorityOptions = [
  { value: 'normal', label: 'Normal', description: 'Standard processing', color: 'bg-gray-100 text-gray-800' },
  { value: 'high', label: 'High', description: 'Higher priority', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', description: 'Immediate attention', color: 'bg-red-100 text-red-800' },
];

interface NewRequestFormProps {
  onSubmit: (data: DeliveryRequestFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function NewRequestForm({ onSubmit, onCancel, isSubmitting = false }: NewRequestFormProps) {
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

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
      serviceType: '',
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

  // Calculate estimated cost based on form data
  const calculateEstimatedCost = () => {
    const serviceType = watchedValues.serviceType;
    const priority = watchedValues.priority;
    const itemCount = watchedValues.items?.length || 0;
    
    let baseCost = 35; // Base cost
    
    // Service type multiplier
    const serviceMultiplier = {
      same_day: 1.0,
      express: 1.5,
      document: 0.8,
      fragile: 1.3,
      inter_emirate: 2.0,
    }[serviceType as keyof typeof serviceMultiplier] || 1.0;
    
    // Priority multiplier
    const priorityMultiplier = {
      normal: 1.0,
      high: 1.2,
      urgent: 1.5,
    }[priority];
    
    // Item count multiplier
    const itemMultiplier = 1 + (itemCount - 1) * 0.1;
    
    const total = baseCost * serviceMultiplier * priorityMultiplier * itemMultiplier;
    setEstimatedCost(Math.round(total));
  };

  // Recalculate cost when relevant fields change
  useState(() => {
    calculateEstimatedCost();
  });

  const handleFormSubmit = (data: DeliveryRequestFormData) => {
    onSubmit(data);
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
        {[1, 2, 3, 4].map((step) => (
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
            {step < totalSteps && (
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
          Service & Priority
        </span>
        <span className={currentStep >= 2 ? 'text-primary font-medium' : 'text-gray-500'}>
          Pickup & Delivery
        </span>
        <span className={currentStep >= 3 ? 'text-primary font-medium' : 'text-gray-500'}>
          Items & Details
        </span>
        <span className={currentStep >= 4 ? 'text-primary font-medium' : 'text-gray-500'}>
          Schedule & Review
        </span>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Service Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serviceTypes.map((service) => (
            <label
              key={service.value}
              className={clsx(
                'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                watchedValues.serviceType === service.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              )}
            >
              <input
                {...register('serviceType')}
                type="radio"
                value={service.value}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{service.label}</p>
                    <p className="text-gray-500">{service.description}</p>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.serviceType && (
          <p className="mt-1 text-sm text-red-600">{errors.serviceType.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Priority Level
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {priorityOptions.map((priority) => (
            <label
              key={priority.value}
              className={clsx(
                'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                watchedValues.priority === priority.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              )}
            >
              <input
                {...register('priority')}
                type="radio"
                value={priority.value}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{priority.label}</p>
                    <p className="text-sm text-gray-500">{priority.description}</p>
                  </div>
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', priority.color)}>
                    {priority.label}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      {/* Pickup Details */}
      <div className="bg-green-50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <MapPinIcon className="w-5 h-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Pickup Details</h3>
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

  const renderStep3 = () => (
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
                  Weight (kg) - Optional
                </label>
                <input
                  {...register(`items.${index}.weight`, { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="0.5"
                />
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

  const renderStep4 = () => (
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
              <p className="text-3xl font-bold text-gray-900">AED {estimatedCost}</p>
              <p className="text-sm text-gray-600">Final cost may vary based on actual weight and distance</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Service: {serviceTypes.find(s => s.value === watchedValues.serviceType)?.label}</p>
              <p>Priority: {watchedValues.priority}</p>
              <p>Items: {watchedValues.items?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Request Summary</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Service:</span> {serviceTypes.find(s => s.value === watchedValues.serviceType)?.label}</p>
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
        {currentStep === 4 && renderStep4()}
        
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