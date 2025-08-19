import { UseFormRegister, Control, useFieldArray } from 'react-hook-form';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { calculateTotalWeight, formatPrice, formatWeight } from '@/lib/api';
import { DeliveryRequestFormData } from '../types';

interface ItemsStepProps {
  register: UseFormRegister<DeliveryRequestFormData>;
  control: Control<DeliveryRequestFormData>;
  watchedValues: DeliveryRequestFormData;
  companyPricing: any;
  loadingPricing: boolean;
  calculatePriceForWeight: (weight: number) => number;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

export function ItemsStep({
  register,
  control,
  watchedValues,
  companyPricing,
  loadingPricing,
  calculatePriceForWeight,
  onAddItem,
  onRemoveItem
}: ItemsStepProps) {
  const { fields } = useFieldArray({
    control,
    name: 'items',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Items to Deliver</h3>
        <button
          type="button"
          onClick={onAddItem}
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
              
              {/* Individual item breakdown */}
              <div className="mt-2 space-y-1">
                {watchedValues.items.map((item, idx) => {
                  const itemWeight = (item.weight || 0) * (item.quantity || 1);
                  const itemPrice = companyPricing && itemWeight > 0 ? calculatePriceForWeight(itemWeight) : 0;
                  const isCOD = item.paymentType === 'cod';
                  const codAmount = item.codAmount || 0;
                  
                  if (itemWeight > 0) {
                    return (
                      <div key={idx} className="text-xs text-blue-700 flex justify-between">
                        <span>
                          Item {idx + 1}: {formatWeight(itemWeight)}
                          {isCOD && <span className="ml-1 text-orange-600 font-medium">(COD: {formatPrice(codAmount)})</span>}
                        </span>
                        <span>{itemPrice > 0 ? formatPrice(itemPrice) : '...'}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              
              {/* COD Summary */}
              {(() => {
                const codItems = watchedValues.items.filter(item => item.paymentType === 'cod');
                const totalCOD = codItems.reduce((sum, item) => sum + (item.codAmount || 0), 0);
                
                if (codItems.length > 0) {
                  return (
                    <div className="mt-3 pt-2 border-t border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-orange-700">
                          Total COD Amount:
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatPrice(totalCOD)}
                        </span>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        {codItems.length} item{codItems.length !== 1 ? 's' : ''} require{codItems.length === 1 ? 's' : ''} cash collection
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
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
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
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
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  {...register(`items.${index}.quantity`, { 
                    setValueAs: (value) => {
                      if (value === '' || value == null) return 1;
                      const num = Number(value);
                      return isNaN(num) ? 1 : Math.max(1, num);
                    }
                  })}
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
                      setValueAs: (value) => {
                        if (value === '' || value == null) return 0.5;
                        const num = Number(value);
                        return isNaN(num) ? 0.5 : Math.max(0.1, num);
                      }
                    })}
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-input pr-20"
                    placeholder="0.5"
                  />
                  {watchedValues.items?.[index]?.weight && (watchedValues.items?.[index]?.weight ?? 0) > 0 && (
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
                  {...register(`items.${index}.value`, { 
                    setValueAs: (value) => value === '' || value == null ? undefined : Number(value)
                  })}
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="100.00"
                />
              </div>
            </div>
            
            {/* Payment Type and COD Amount */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Payment Information</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type
                  </label>
                  <select
                    {...register(`items.${index}.paymentType`)}
                    className="form-input"
                  >
                    <option value="paid">Paid</option>
                    <option value="cod">Cash on Delivery (COD)</option>
                  </select>
                </div>
                
                {watchedValues.items?.[index]?.paymentType === 'cod' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      COD Amount (AED) <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register(`items.${index}.codAmount`, { 
                        setValueAs: (value) => {
                          if (value === '' || value == null) return undefined;
                          const num = Number(value);
                          return isNaN(num) ? undefined : Math.max(0.01, num);
                        },
                        required: watchedValues.items?.[index]?.paymentType === 'cod' ? 'COD amount is required' : false
                      })}
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      placeholder="0.00"
                    />
                    <p className="mt-1 text-xs text-gray-600">
                      Amount to be collected from recipient upon delivery
                    </p>
                  </div>
                )}
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
}