import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { CalendarIcon, CurrencyDollarIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { calculateTotalWeight, formatPrice, formatWeight, PriceCalculation } from '@/lib/api';
import { DeliveryRequestFormData } from '../types';

interface ScheduleReviewStepProps {
  register: UseFormRegister<DeliveryRequestFormData>;
  errors?: FieldErrors<DeliveryRequestFormData>;
  watchedValues: DeliveryRequestFormData;
  estimatedCost: number | null;
  priceCalculation: PriceCalculation | null;
  showValidationErrors?: boolean;
  stepValidation?: { [key: number]: boolean };
}

export function ScheduleReviewStep({
  register,
  errors,
  watchedValues,
  estimatedCost,
  priceCalculation,
  showValidationErrors,
  stepValidation
}: ScheduleReviewStepProps) {
  const isScheduled = watchedValues.schedule?.isScheduled;
  const totalWeight = calculateTotalWeight(watchedValues.items || []);

  return (
    <div className="space-y-6">
      {/* Optional Scheduling Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center mb-4">
          <CalendarIcon className="w-6 h-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Schedule (Optional)</h3>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center">
            <input
              {...register('schedule.isScheduled')}
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm font-medium text-gray-900">
              Set specific pickup and delivery times
            </label>
          </div>
          <p className="text-xs text-gray-600 mt-1 ml-6">
            Leave unchecked for flexible scheduling within 2-3 business days
          </p>
        </div>
        
        {isScheduled && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Date *
                </label>
                <input
                  {...register('schedule.pickupDate')}
                  type="date"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    errors?.schedule?.pickupDate
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors?.schedule?.pickupDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.schedule.pickupDate.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Time *
                </label>
                <input
                  {...register('schedule.pickupTime')}
                  type="time"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    errors?.schedule?.pickupTime
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors?.schedule?.pickupTime && (
                  <p className="mt-1 text-xs text-red-600">{errors.schedule.pickupTime.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date *
                </label>
                <input
                  {...register('schedule.deliveryDate')}
                  type="date"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    errors?.schedule?.deliveryDate
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors?.schedule?.deliveryDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.schedule.deliveryDate.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Time *
                </label>
                <input
                  {...register('schedule.deliveryTime')}
                  type="time"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    errors?.schedule?.deliveryTime
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors?.schedule?.deliveryTime && (
                  <p className="mt-1 text-xs text-red-600">{errors.schedule.deliveryTime.message}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weight-Based Price Calculation */}
      {estimatedCost && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center mb-4">
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              <ScaleIcon className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-2">Weight-Based Pricing</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Cost Display */}
            <div className="text-center lg:text-left">
              <div className="flex items-baseline justify-center lg:justify-start space-x-2 mb-3">
                <p className="text-4xl font-bold text-gray-900">{formatPrice(estimatedCost)}</p>
                <span className="text-sm text-gray-600">AED</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Based on {formatWeight(totalWeight)} total weight
              </p>
              
              {priceCalculation?.pricingName && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {priceCalculation.pricingName}
                  {priceCalculation.isCustomPricing && ' (Custom)'}
                </div>
              )}
              
              {/* Weight Breakdown */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">📦 Items Weight</h4>
                <div className="space-y-1">
                  {watchedValues.items?.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-600">
                        {item.description || `Item ${index + 1}`} (×{item.quantity})
                      </span>
                      <span className="font-medium">
                        {formatWeight((item.weight || 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-gray-200 flex justify-between text-sm font-medium">
                    <span>Total Weight:</span>
                    <span className="text-green-700">{formatWeight(totalWeight)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pricing Details */}
            <div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Weight:</span>
                  <span className="font-semibold text-green-700">{formatWeight(totalWeight)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Base cost from admin pricing:</span>
                  <span className="font-medium">
                    {priceCalculation?.breakdown?.tier ? 
                      `${formatPrice(priceCalculation.breakdown.tier.price)}` : 
                      'Admin tier pricing'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Weight-based pricing:</span>
                  <span className="font-medium text-green-600">
                    As per admin tiers
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Items count:</span>
                  <span className="font-medium">{watchedValues.items?.length || 0}</span>
                </div>
                
                <div className="pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Final Price:</span>
                    <span className="text-lg font-bold text-green-700">{formatPrice(estimatedCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {priceCalculation?.breakdown?.calculation && (
            <div className="mt-4 pt-3 border-t border-green-200">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Calculation:</span> {priceCalculation.breakdown.calculation}
              </p>
            </div>
          )}
          
          {/* Pricing Information */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-1">💡 How pricing works</h4>
            <p className="text-xs text-blue-700">
              Pricing is calculated based on total weight using admin-configured delivery pricing tiers. 
              Each tier adds to the total cost in a cumulative manner.
            </p>
          </div>
        </div>
      )}

      {/* Enhanced Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Request Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">
                <span className="font-medium">Delivery Request</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <ScaleIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm">
                <span className="font-medium">Total Weight:</span> {formatWeight(totalWeight)}
              </span>
            </div>
            
            <p className="text-sm"><span className="font-medium">Items:</span> {watchedValues.items?.length || 0} item(s)</p>
            
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-1">📍 Pickup:</p>
              <p className="text-gray-600 pl-4">{watchedValues.pickupDetails?.address}</p>
            </div>
            
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-1">📍 Delivery:</p>
              <p className="text-gray-600 pl-4">{watchedValues.deliveryDetails?.address}</p>
            </div>
          </div>
          
          {/* Right Column - Scheduling & Payment */}
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-1">📅 Delivery Schedule:</p>
              <div className="pl-4">
                {isScheduled ? (
                  <div>
                    <p className="text-gray-600">Specific times requested</p>
                    <p className="text-gray-600 text-xs mt-1">
                      Pickup: {watchedValues.schedule?.pickupDate} at {watchedValues.schedule?.pickupTime}<br/>
                      Delivery: {watchedValues.schedule?.deliveryDate} at {watchedValues.schedule?.deliveryTime}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">Flexible (2-3 business days)</p>
                )}
              </div>
            </div>
            
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-1">💰 Estimated Cost:</p>
              <div className="pl-4">
                <p className="text-xl font-bold text-green-700">
                  {estimatedCost ? formatPrice(estimatedCost) : 'Calculating...'}
                </p>
                <p className="text-xs text-gray-600">
                  Based on {formatWeight(totalWeight)} weight
                </p>
              </div>
            </div>
            
            {/* COD Summary */}
            {(() => {
              const codItems = watchedValues.items?.filter(item => item.paymentType === 'cod') || [];
              const totalCOD = codItems.reduce((sum, item) => sum + (item.codAmount || 0), 0);
              
              if (codItems.length > 0) {
                return (
                  <div className="text-sm">
                    <p className="font-medium text-orange-700 mb-1">💵 COD Collection:</p>
                    <div className="pl-4">
                      <p className="text-orange-600 font-semibold">{formatPrice(totalCOD)}</p>
                      <p className="text-xs text-gray-600">
                        {codItems.length} item{codItems.length !== 1 ? 's' : ''} require cash collection
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="text-sm">
                  <p className="font-medium text-green-700">💳 Payment: Prepaid</p>
                </div>
              );
            })()} 
          </div>
        </div>
      </div>
    </div>
  );
}