import { UseFormRegister, Control, FieldArrayWithId, FieldErrors } from 'react-hook-form';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { calculateTotalWeight, formatPrice, formatWeight } from '@/lib/api';
import { DeliveryRequestFormData } from '../types';

interface ItemsStepProps {
  register: UseFormRegister<DeliveryRequestFormData>;
  control: Control<DeliveryRequestFormData>;
  errors?: FieldErrors<DeliveryRequestFormData>;
  fields: FieldArrayWithId<DeliveryRequestFormData, "items", "id">[];
  watchedValues: DeliveryRequestFormData;
  companyPricing: any;
  loadingPricing: boolean;
  estimatedCost: number | null;
  calculatingPrice: boolean;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  showValidationErrors?: boolean;
}

export function ItemsStep({
  register,
  control,
  errors,
  fields,
  watchedValues,
  companyPricing,
  loadingPricing,
  estimatedCost,
  calculatingPrice,
  onAddItem,
  onRemoveItem,
  showValidationErrors
}: ItemsStepProps) {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Items to Deliver</h3>
          <div className="flex items-center space-x-3 mt-1">
            <p className="text-sm text-gray-500">
              {fields.length} item{fields.length !== 1 ? 's' : ''}
            </p>
            <div className="flex-1 max-w-32">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(fields.length / 10) * 100}%` }}
                ></div>
              </div>
            </div>
            <span className="text-xs text-gray-400">Max 10</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddItem}
          disabled={fields.length >= 10}
          className="group inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
        >
          <PlusIcon className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
          Add Item
          {fields.length >= 10 && <span className="ml-2 text-xs">(Max reached)</span>}
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
                  const isCOD = item.paymentType === 'cod';
                  const codAmount = item.codAmount || 0;
                  
                  if (itemWeight > 0) {
                    return (
                      <div key={idx} className="text-xs text-blue-700 flex justify-between">
                        <span>
                          Item {idx + 1}: {formatWeight(itemWeight)}
                          {isCOD && <span className="ml-1 text-orange-600 font-medium">(COD: {formatPrice(codAmount)})</span>}
                        </span>
                        <span className="text-gray-500">Weight only</span>
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
            
            {(loadingPricing || calculatingPrice) && (
              <div className="flex items-center text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                {calculatingPrice ? 'Calculating price...' : 'Loading pricing...'}
              </div>
            )}
            
            {!calculatingPrice && calculateTotalWeight(watchedValues.items) > 0 && (
              <div className="text-right">
                <p className="text-sm text-blue-700">Total Estimated Price</p>
                <p className="text-xl font-bold text-blue-600">
                  {estimatedCost ? formatPrice(estimatedCost) : 'Calculating...'}
                </p>
                <p className="text-xs text-blue-600">
                  Priority: {watchedValues.priority} ({
                    { normal: '1.0x', high: '1.2x', urgent: '1.5x' }[watchedValues.priority]
                  })
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Using {companyPricing?.isCustom ? 'custom' : 'default'} pricing via API
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div 
            key={field.id} 
            className="relative border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 animate-in fade-in slide-in-from-top-2"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{index + 1}</span>
                </div>
                <h4 className="font-semibold text-gray-900">Item {index + 1}</h4>
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveItem(index);
                  }}
                  className="group inline-flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-sm active:scale-95"
                  title="Remove this item"
                >
                  <XMarkIcon className="w-4 h-4 mr-1 transition-transform duration-200 group-hover:rotate-90" />
                  Remove
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              {/* Main Item Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Item Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register(`items.${index}.description`)}
                    type="text"
                    className="form-input"
                    placeholder="Describe the item (e.g., Documents, Electronics, Clothing, etc.)"
                  />
                </div>
              </div>

              {/* Quantity, Weight & Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                          {(() => {
                            const item = watchedValues.items?.[index];
                            if (!item) return '';
                            const itemWeight = (item.weight || 0) * (item.quantity || 1);
                            return itemWeight > 0 ? `${formatWeight(itemWeight)}` : '';
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dimensions (Optional)
                  </label>
                  <input
                    {...register(`items.${index}.dimensions`)}
                    type="text"
                    className="form-input"
                    placeholder="L x W x H (cm)"
                  />
                </div>
              </div>

              {/* Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Item Value (AED) - Optional
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
                  <p className="mt-1 text-xs text-gray-600">For insurance purposes</p>
                </div>
              </div>
            </div>
            
            {/* Payment Type and COD Amount */}
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <h5 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                Payment Information
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  <div className="transition-all duration-300 ease-in-out">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
            
            {/* Special Handling */}
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <label className="flex items-start space-x-3">
                <input
                  {...register(`items.${index}.fragile`)}
                  type="checkbox"
                  className="mt-1 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">
                    Fragile Item
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    Requires special handling and extra care during transport
                  </p>
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Details */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
          Additional Details
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Special Requirements (Optional)
            </label>
            <textarea
              {...register('specialRequirements')}
              className="form-input"
              rows={3}
              placeholder="Any special handling requirements, temperature control, insurance, fragile handling instructions, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Internal Reference (Optional)
            </label>
            <input
              {...register('internalReference')}
              type="text"
              className="form-input"
              placeholder="Your internal tracking number or reference code"
            />
          </div>
        </div>
      </div>
    </div>
  );
}